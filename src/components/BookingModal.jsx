import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

export default function BookingModal({ isOpen, onClose, booking, onConfirm, onCancelBooking, isLoading }) {
  if (!isOpen || !booking) return null

  const handleConfirm = () => {
    onConfirm(booking.ta, booking.slot)
    onClose()
  }

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      try {
        await deleteDoc(doc(db, 'bookings', booking.id))
        onCancelBooking(booking.id)
        onClose()
      } catch (error) {
        console.error('Error canceling booking:', error)
        alert('Error canceling booking. Please try again.')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{booking.id ? 'Your Booking' : 'Confirm Booking'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="booking-details">
            <div className="detail-item">
              <span className="detail-label">TA:</span>
              <span className="detail-value">{booking.ta}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{booking.date}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time:</span>
              <span className="detail-value">{booking.time}</span>
            </div>
            {booking.id && (
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value status-confirmed">Confirmed</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          {booking.id ? (
            <button className="button button--secondary" onClick={handleCancel} disabled={isLoading}>
              Cancel Booking
            </button>
          ) : (
            <button className="button" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
