"use client";

import { useState, useEffect, useCallback } from "react";
import { assets as assetsApi, bookings as bookingsApi } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select } from "../components/ui/FormField";
import { BookingStatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import type { Asset, Booking, BookingPayload } from "../lib/types";
import { validateBooking, hasErrors } from "../lib/validation";



// Generates a display grid from 8:00 to 18:00
const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => i + 8);

function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Convert a local datetime string (YYYY-MM-DDTHH:MM) to a full ISO string */
function localToISO(localDt: string): string {
  // datetime-local gives "YYYY-MM-DDTHH:MM" — treat as local time
  return new Date(localDt).toISOString();
}

/** Get a datetime-local string (YYYY-MM-DDTHH:MM) from a Date, in local time */
function toDateTimeLocal(date: Date): string {
  const yr  = date.getFullYear();
  const mo  = String(date.getMonth() + 1).padStart(2, "0");
  const dy  = String(date.getDate()).padStart(2, "0");
  const hh  = String(date.getHours()).padStart(2, "0");
  const mm  = String(date.getMinutes()).padStart(2, "0");
  return `${yr}-${mo}-${dy}T${hh}:${mm}`;
}

export function BookingScreen() {
  const { toast } = useToast();

  const [bookableAssets, setAssets]    = useState<Asset[]>([]);
  const [bookingList,    setBookings]  = useState<Booking[]>([]);
  const [loading,        setLoading]   = useState(true);
  const [apiError,       setApiError]  = useState(false);
  const [selectedId,     setSelectedId] = useState("");

  const [showBook,   setShowBook]   = useState(false);
  const [form,       setForm]       = useState({ title: "", start_time: "", end_time: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({});
  const [submitting, setSubmitting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [aRes, bRes] = await Promise.all([
        assetsApi.list({ is_bookable: true }),
        bookingsApi.list(),
      ]);
      const assetData = Array.isArray(aRes.data)
        ? aRes.data
        : (aRes.data as unknown as { assets: Asset[] })?.assets ?? [];
      setAssets(assetData);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
      if (assetData.length > 0) setSelectedId(assetData[0].id);
    } catch (err) {
      console.error("Booking load error:", err);
      setApiError(true);
      toast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const selected = bookableAssets.find((a) => a.id === selectedId);
  const todayBase = new Date();
  todayBase.setHours(0, 0, 0, 0);

  // Bookings for the selected resource (today)
  const resourceBookings = bookingList.filter(
    (b) => b.asset_id === selectedId && b.status !== "cancelled"
  );

  // ─── Book ─────────────────────────────────────────────────────────
  function openBook() {
    const now   = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    // default to next full hour, clamped to 08:00–17:00
    const h = start.getHours() < 8 ? 8 : start.getHours() >= 17 ? 17 : start.getHours() + 1;
    start.setHours(h, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    setForm({
      title:      "",
      start_time: toDateTimeLocal(start),
      end_time:   toDateTimeLocal(end),
      notes:      "",
    });
    setFormErrors({});
    setShowBook(true);
  }

  async function submitBook() {
    const errors = validateBooking({ asset_id: selectedId, ...form });
    setFormErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const payload: BookingPayload = {
      asset_id:   selectedId,
      title:      form.title,
      start_time: localToISO(form.start_time),
      end_time:   localToISO(form.end_time),
      notes:      form.notes || undefined,
    };

    try {
      await bookingsApi.create(payload);
      toast("Booking confirmed!");
      setShowBook(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("400") || msg.toLowerCase().includes("overlap") || msg.toLowerCase().includes("conflict")) {
        toast("Time slot conflict — choose a different time", "error");
      } else {
        toast("Failed to confirm booking", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Cancel ────────────────────────────────────────────────────────
  async function submitCancel() {
    if (!cancelTarget) return;
    try {
      await bookingsApi.cancel(cancelTarget.id, cancelReason);
      toast("Booking cancelled");
      loadData();
    } catch (err) {
      console.error("Cancel error:", err);
      toast("Failed to cancel booking", "error");
    }
    setCancelTarget(null);
    setCancelReason("");
  }

  return (
    <div className="animate-fade-up">
      <h1 className="page-title">Resource Booking</h1>

      <div style={{ marginBottom: 20, maxWidth: 480 }}>
        <FormField label="Resource">
          <Select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            options={bookableAssets.map((a) => ({
              value: a.id,
              label: `${a.name} — ${a.location ?? a.asset_tag}`,
            }))}
          />
        </FormField>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong>{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>Retry</button>
        </div>
      ) : (
        <>
          {/* Calendar View */}
          <div className="card animate-fade-up" style={{ marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {selected?.name} — Today
              </h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
              </span>
            </div>

            {HOUR_SLOTS.map((h) => {
              const slotStartMin = h * 60;
              const slotEndMin   = slotStartMin + 60;

              const booking = resourceBookings.find((b) => {
                const bStart = toMinutes(b.start_time);
                const bEnd   = toMinutes(b.end_time);
                return bStart < slotEndMin && bEnd > slotStartMin;
              });

              return (
                <div key={h} className="time-slot">
                  <span className="time-label">
                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </span>
                  {booking ? (
                    <div
                      className={`booking-block ${
                        booking.status === "cancelled" ? "booking-conflict" : "booking-confirmed"
                      }`}
                      style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span>
                        <strong>{booking.title}</strong>
                        {booking.booked_by_name && (
                          <span style={{ fontSize: 11.5, marginLeft: 8, opacity: 0.8 }}>
                            — {booking.booked_by_name}
                          </span>
                        )}
                        <span style={{ fontSize: 11.5, marginLeft: 8, opacity: 0.8 }}>
                          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </span>
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <BookingStatusBadge status={booking.status} />
                        {booking.status !== "cancelled" && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, color: "var(--danger)", padding: "2px 6px" }}
                            onClick={() => { setCancelTarget(booking); setCancelReason(""); }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ flex: 1, height: 36, borderRadius: 4, cursor: "pointer", transition: "background 0.15s ease" }}
                      className="empty-slot"
                      onClick={() => {
                        const base = new Date();
                        base.setHours(h, 0, 0, 0);
                        const endBase = new Date(base);
                        endBase.setHours(h + 1, 0, 0, 0);
                        setForm({ title: "", start_time: toDateTimeLocal(base), end_time: toDateTimeLocal(endBase), notes: "" });
                        setFormErrors({});
                        setShowBook(true);
                      }}
                      title="Click to book this slot"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary" onClick={openBook}>
            Book a Slot
          </button>

          {/* All bookings list */}
          {bookingList.filter((b) => b.asset_id === selectedId).length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 className="section-title" style={{ fontSize: 15 }}>All Bookings for this Resource</h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="af-table">
                  <thead>
                    <tr><th>Title</th><th>Booked By</th><th>Start</th><th>End</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {bookingList
                      .filter((b) => b.asset_id === selectedId)
                      .map((b, i) => (
                        <tr key={b.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                          <td style={{ fontWeight: 500 }}>{b.title}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{b.booked_by_name ?? "—"}</td>
                          <td style={{ fontSize: 12.5 }}>{formatTime(b.start_time)}</td>
                          <td style={{ fontSize: 12.5 }}>{formatTime(b.end_time)}</td>
                          <td><BookingStatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Book Modal ────────────────────────────────────────────── */}
      {showBook && (
        <Modal title="Book a Slot" onClose={() => setShowBook(false)} width={560}>
          <FormField label="Title" error={formErrors.title} required>
            <Input
              value={form.title}
              error={formErrors.title}
              placeholder="e.g. Team Standup"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </FormField>

          {/* Start Time */}
          <FormField label="Start Time" error={formErrors.start_time} required>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 180px", minWidth: 180 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Date</label>
                <Input
                  type="date"
                  value={form.start_time.split("T")[0]}
                  style={{ minWidth: 0 }}
                  onChange={(e) => {
                    const [, time] = form.start_time.split("T");
                    setForm({ ...form, start_time: `${e.target.value}T${time}` });
                  }}
                />
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Hour</label>
                <Select
                  value={form.start_time.split("T")[1]?.split(":")[0] ?? "10"}
                  options={Array.from({ length: 24 }, (_, h) => ({
                    value: String(h).padStart(2, "0"),
                    label: h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`,
                  }))}
                  onChange={(e) => {
                    const [date] = form.start_time.split("T");
                    const [, min] = (form.start_time.split("T")[1] ?? "10:00").split(":");
                    setForm({ ...form, start_time: `${date}T${e.target.value}:${min}` });
                  }}
                />
              </div>
              <div style={{ flex: "0 0 80px" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Minute</label>
                <Select
                  value={form.start_time.split("T")[1]?.split(":")[1] ?? "00"}
                  options={Array.from({ length: 60 }, (_, m) => ({
                    value: String(m).padStart(2, "0"),
                    label: String(m).padStart(2, "0"),
                  }))}
                  onChange={(e) => {
                    const [date] = form.start_time.split("T");
                    const [hr] = (form.start_time.split("T")[1] ?? "10:00").split(":");
                    setForm({ ...form, start_time: `${date}T${hr}:${e.target.value}` });
                  }}
                />
              </div>
            </div>
          </FormField>

          {/* End Time */}
          <FormField label="End Time" error={formErrors.end_time} required>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 180px", minWidth: 180 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Date</label>
                <Input
                  type="date"
                  value={form.end_time.split("T")[0]}
                  min={form.start_time.split("T")[0]}
                  style={{ minWidth: 0 }}
                  onChange={(e) => {
                    const [, time] = form.end_time.split("T");
                    setForm({ ...form, end_time: `${e.target.value}T${time}` });
                  }}
                />
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Hour</label>
                <Select
                  value={form.end_time.split("T")[1]?.split(":")[0] ?? "11"}
                  options={Array.from({ length: 24 }, (_, h) => ({
                    value: String(h).padStart(2, "0"),
                    label: h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`,
                  }))}
                  onChange={(e) => {
                    const [date] = form.end_time.split("T");
                    const [, min] = (form.end_time.split("T")[1] ?? "11:00").split(":");
                    setForm({ ...form, end_time: `${date}T${e.target.value}:${min}` });
                  }}
                />
              </div>
              <div style={{ flex: "0 0 80px" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Minute</label>
                <Select
                  value={form.end_time.split("T")[1]?.split(":")[1] ?? "00"}
                  options={Array.from({ length: 60 }, (_, m) => ({
                    value: String(m).padStart(2, "0"),
                    label: String(m).padStart(2, "0"),
                  }))}
                  onChange={(e) => {
                    const [date] = form.end_time.split("T");
                    const [hr] = (form.end_time.split("T")[1] ?? "11:00").split(":");
                    setForm({ ...form, end_time: `${date}T${hr}:${e.target.value}` });
                  }}
                />
              </div>
            </div>
          </FormField>

          <FormField label="Notes">
            <Input
              value={form.notes}
              placeholder="Optional notes…"
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setShowBook(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitBook} disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Confirm Booking"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Cancel Booking Modal ──────────────────────────────────── */}
      {cancelTarget && (
        <Modal title="Cancel Booking" onClose={() => setCancelTarget(null)}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Cancelling: <strong>{cancelTarget.title}</strong>
          </p>
          <FormField label="Reason (optional)">
            <Input
              value={cancelReason}
              placeholder="Why are you cancelling?"
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setCancelTarget(null)}>Back</button>
            <button className="btn btn-danger" onClick={submitCancel}>Cancel Booking</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
