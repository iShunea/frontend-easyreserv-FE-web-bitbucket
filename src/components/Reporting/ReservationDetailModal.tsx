import React, { useEffect, useState, useCallback } from "react";
import classes from "./ReservationDetailModal.module.css";
import { getReservationDetails } from "src/auth/api/requests";
import dayjs from "dayjs";

interface Order {
  id: string;
  title: string;
  quantity: number;
  price: number | string;
  status: string;
  serviceType: string;
  courseType: string;
  doneness?: string;
  creationNotice?: string;
  deletionNotice?: string;
  isPreorder: boolean;
  readyAt?: string;
  product?: {
    id: string;
    name: string;
    preparationZone: string;
  } | null;
}

interface ReservationDetails {
  id: string;
  paymentType: string;
  staffName: string;
  createdAt: string;
  date: string;
  startTime: string;
  endTime: string;
  guestsNumber: number;
  status: string;
  tableNumber: string;
  customerName: string;
  reason?: string;
  bonusType: string;
  printStatus: string;
  orders: Order[];
}

interface ReservationDetailModalProps {
  reservationId: string | null;
  onClose: () => void;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({
  reservationId,
  onClose,
}) => {
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservationDetails = useCallback(async () => {
    if (!reservationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getReservationDetails(reservationId);
      setReservationDetails(data);
    } catch (err) {
      console.error("Error fetching reservation details:", err);
      setError("Failed to load reservation details");
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    if (reservationId) {
      fetchReservationDetails();
    }
  }, [reservationId, fetchReservationDetails]);

  const formatTime = (timeString: string) => {
    return dayjs(timeString).format("HH:mm");
  };

  const formatDateTime = (dateString: string) => {
    return dayjs(dateString).format("DD/MM/YYYY HH:mm");
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("DD/MM/YYYY");
  };

  const calculateTotalPrice = () => {
    if (!reservationDetails?.orders) return 0;
    return reservationDetails.orders.reduce((total, order) => {
      const price = typeof order.price === 'string' ? parseFloat(order.price) : order.price;
      return total + (price * order.quantity);
    }, 0);
  };

  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  if (!reservationId) return null;

  return (
    <div className={classes.modalOverlay} onClick={onClose}>
      <div className={classes.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={classes.modalHeader}>
          <h2>Reservation Details</h2>
          <span className={classes.closeButton} onClick={onClose}>
            ×
          </span>
        </div>

        <div className={classes.modalBody}>
          {loading && (
            <div className={classes.loadingContainer}>
              <div className={classes.loader}></div>
              <p>Loading reservation details...</p>
            </div>
          )}

          {error && (
            <div className={classes.errorContainer}>
              <p>{error}</p>
              <button onClick={fetchReservationDetails} className={classes.retryButton}>
                Retry
              </button>
            </div>
          )}

          {reservationDetails && !loading && !error && (
            <>
              {/* Reservation Information */}
              <div className={classes.section}>
                <h3>Reservation Information</h3>
                <div className={classes.detailRow}>
                  <span>Reservation ID:</span>
                  <span>{reservationDetails.id}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Customer:</span>
                  <span>{reservationDetails.customerName}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Staff:</span>
                  <span>{reservationDetails.staffName}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Table:</span>
                  <span>{reservationDetails.tableNumber}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Date:</span>
                  <span>{formatDate(reservationDetails.date)}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Time:</span>
                  <span>
                    {formatTime(reservationDetails.startTime)} - {formatTime(reservationDetails.endTime)}
                  </span>
                </div>
                <div className={classes.detailRow}>
                  <span>Guests:</span>
                  <span>{reservationDetails.guestsNumber}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Status:</span>
                  <span>{reservationDetails.status}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Payment Type:</span>
                  <span>{reservationDetails.paymentType}</span>
                </div>
                <div className={classes.detailRow}>
                  <span>Created At:</span>
                  <span>{formatDateTime(reservationDetails.createdAt)}</span>
                </div>
                {reservationDetails.reason && (
                  <div className={classes.detailRow}>
                    <span>Reason:</span>
                    <span>{reservationDetails.reason}</span>
                  </div>
                )}
              </div>

              {/* Orders Section */}
              {reservationDetails.orders && reservationDetails.orders.length > 0 && (
                <div className={classes.section}>
                  <h3>Orders ({reservationDetails.orders.length})</h3>
                  {reservationDetails.orders.map((order, index) => (
                    <div key={order.id} className={classes.orderCard}>
                      <div className={classes.orderHeader}>
                        <span className={classes.orderTitle}>
                          #{index + 1} {order.title}
                        </span>
                        <span className={classes.orderPrice}>
                          {formatPrice((typeof order.price === 'string' ? parseFloat(order.price) : order.price) * order.quantity)} MDL
                        </span>
                      </div>
                      
                      <div className={classes.orderDetails}>
                        <div className={classes.detailRow}>
                          <span>Quantity:</span>
                          <span>{order.quantity}</span>
                        </div>
                        <div className={classes.detailRow}>
                          <span>Price each:</span>
                          <span>{formatPrice(order.price)} MDL</span>
                        </div>
                        <div className={classes.detailRow}>
                          <span>Status:</span>
                          <span>{order.status}</span>
                        </div>
                        
                        {order.product && (
                          <>
                            <div className={classes.detailRow}>
                              <span>Product:</span>
                              <span>{order.product.name}</span>
                            </div>
                            <div className={classes.detailRow}>
                              <span>Zone:</span>
                              <span>{order.product.preparationZone}</span>
                            </div>
                          </>
                        )}
                        
                        {order.doneness && (
                          <div className={classes.detailRow}>
                            <span>Doneness:</span>
                            <span>{order.doneness}</span>
                          </div>
                        )}
                        
                        {order.creationNotice && (
                          <div className={classes.detailRow}>
                            <span>Note:</span>
                            <span>{order.creationNotice}</span>
                          </div>
                        )}
                        
                        {order.isPreorder && (
                          <div className={classes.detailRow}>
                            <span>Type:</span>
                            <span className={classes.preorderBadge}>Pre-order</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className={classes.totalPrice}>
                    <div className={classes.detailRow}>
                      <span>Total:</span>
                      <span>{formatPrice(calculateTotalPrice())} MDL</span>
                    </div>
                  </div>
                </div>
              )}

              {(!reservationDetails.orders || reservationDetails.orders.length === 0) && (
                <div className={classes.section}>
                  <h3>Orders</h3>
                  <p className={classes.noOrders}>No orders found for this reservation.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailModal;