import { useEffect, useState } from "react";
import classes from "./ReservationsReport.module.css";
import {
  exportIcon,
  LeftArrow,
  arrowLeftIcon,
  arrowRightIcon,
} from "src/icons/icons";
import { NotificationButton } from "../Statistics/Header";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  getReservationsReport,
  getAuthenticatedUser,
  getRestaurantById,
} from "src/auth/api/requests";
import ReservationDetailModal from "./ReservationDetailModal";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ReservationReportData {
  id: string;
  paymentType: string;
  staffName: string;
  createdAt: string;
  date: string;
  guestsNumber: number;
  status: string;
  tableNumber: string;
  customerName: string;
  total: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedResponse {
  data: ReservationReportData[];
  meta: PaginationMeta;
}

type TimePeriod = "1_day" | "3_days" | "7_days" | "month" | "all_time";

const ReservationsReport = () => {
  const navigate = useNavigate();
  const [reservationsData, setReservationsData] = useState<
    ReservationReportData[]
  >([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);
  const [searchId, setSearchId] = useState<string>("");
  const [debouncedSearchId, setDebouncedSearchId] = useState<string>("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchId(searchId);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchId]);

  useEffect(() => {
    const fetchReservationsData = async () => {
      const loaderTimeout = setTimeout(() => {
        setShowLoader(true);
      }, 300);

      try {
        let startDate: string | undefined;
        let endDate: string | undefined;

        // Calculate date range based on time period and current date
        if (timePeriod === "month") {
          startDate = currentDate.startOf("month").format("YYYY-MM-DD");
          endDate = currentDate.endOf("month").format("YYYY-MM-DD");
        } else if (timePeriod === "1_day") {
          startDate = currentDate.format("YYYY-MM-DD");
          endDate = currentDate.format("YYYY-MM-DD");
        } else if (timePeriod === "3_days") {
          const start = currentDate.clone().subtract(2, "day");
          startDate = start.format("YYYY-MM-DD");
          endDate = currentDate.format("YYYY-MM-DD");
        } else if (timePeriod === "7_days") {
          const start = currentDate.clone().subtract(6, "day");
          startDate = start.format("YYYY-MM-DD");
          endDate = currentDate.format("YYYY-MM-DD");
        }
        // For 'all_time', no date filtering is applied

        const response: PaginatedResponse = await getReservationsReport(
          currentPage,
          pageSize,
          timePeriod,
          startDate,
          endDate,
          debouncedSearchId.trim() || undefined
        );
        console.log("Reservations data:", response);

        setReservationsData(response.data);
        setPaginationMeta(response.meta);
      } catch (error) {
        console.error("Error fetching reservations data:", error);
        setReservationsData([]);
        // Keep pagination meta to prevent pagination from disappearing
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      } finally {
        clearTimeout(loaderTimeout);
        setShowLoader(false);
      }
    };

    fetchReservationsData();
  }, [currentPage, pageSize, timePeriod, currentDate, debouncedSearchId]);

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const userData = await getAuthenticatedUser();
        console.log("User data:", userData);

        const restaurantId =
          userData?.restaurant?.id ||
          userData?.restaurantId ||
          userData?.Restaurant?.id;

        if (!restaurantId) {
          console.error("No restaurant ID found in user data");
          setRestaurantInfo("Default Restaurant");
          return;
        }

        const restaurantData = await getRestaurantById(restaurantId);
        console.log("Restaurant data:", restaurantData);

        if (!restaurantData?.name) {
          console.error("No restaurant name found");
          setRestaurantInfo("Default Restaurant");
          return;
        }

        setRestaurantInfo(restaurantData.name);
      } catch (error) {
        console.error("Error fetching restaurant info:", error);
        setRestaurantInfo("Restaurant");
      }
    };

    fetchRestaurantInfo();
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setCurrentPage(1); // Reset to first page when changing time period
  };

  const subtractPeriod = () => {
    if (timePeriod === "month") {
      setCurrentDate((prev) => prev.subtract(1, "month"));
    } else if (timePeriod === "7_days") {
      setCurrentDate((prev) => prev.subtract(1, "week"));
    } else if (timePeriod === "3_days") {
      setCurrentDate((prev) => prev.subtract(3, "day"));
    } else if (timePeriod === "1_day") {
      setCurrentDate((prev) => prev.subtract(1, "day"));
    }
    setCurrentPage(1);
  };

  const addPeriod = () => {
    if (timePeriod === "month") {
      setCurrentDate((prev) => prev.add(1, "month"));
    } else if (timePeriod === "7_days") {
      setCurrentDate((prev) => prev.add(1, "week"));
    } else if (timePeriod === "3_days") {
      setCurrentDate((prev) => prev.add(3, "day"));
    } else if (timePeriod === "1_day") {
      setCurrentDate((prev) => prev.add(1, "day"));
    }
    setCurrentPage(1);
  };

  const datepicker = (
    <div className={classes.date_picker}>
      <div onClick={subtractPeriod} className={classes.DatePickerArrow}>
        {arrowLeftIcon}
      </div>
      <div className={classes.date_value}>
        {timePeriod === "month"
          ? currentDate.format("MMMM, YYYY")
          : timePeriod === "1_day"
          ? currentDate.format("D MMM")
          : timePeriod === "3_days"
          ? (() => {
              const startDate = currentDate.clone().subtract(2, "day");
              const endDate = currentDate.clone();
              if (startDate.format("MMM") === endDate.format("MMM")) {
                return `${startDate.format("D")}-${endDate.format("D MMM")}`;
              } else {
                return `${startDate.format("D MMM")}-${endDate.format(
                  "D MMM"
                )}`;
              }
            })()
          : timePeriod === "7_days"
          ? (() => {
              const startDate = currentDate.clone().subtract(6, "day");
              const endDate = currentDate.clone();
              if (startDate.format("MMM") === endDate.format("MMM")) {
                return `${startDate.format("D")}-${endDate.format("D MMM")}`;
              } else {
                return `${startDate.format("D MMM")}-${endDate.format(
                  "D MMM"
                )}`;
              }
            })()
          : ""}
      </div>
      <div onClick={addPeriod} className={classes.DatePickerArrow}>
        {arrowRightIcon}
      </div>
    </div>
  );

  const handleReservationClick = (reservationId: string) => {
    setSelectedReservationId(reservationId);
  };

  const handleCloseModal = () => {
    setSelectedReservationId(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchId(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchId("");
    setDebouncedSearchId("");
    setCurrentPage(1);
  };

  const handleExport = async (type: "pdf" | "excel") => {
    try {
      const restaurantName = restaurantInfo || "Restaurant";

      if (!reservationsData || reservationsData.length === 0) {
        console.error("No reservations data to export");
        return;
      }

      if (type === "excel") {
        const workbook = XLSX.utils.book_new();

        const titleData = [
          [restaurantName],
          ["Reservations Report"],
          [`Generated: ${dayjs().format("DD/MM/YYYY HH:mm")}`],
          [],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(titleData);

        const reservationsRows = reservationsData.map((reservation) => ({
          ID: reservation.id,
          "Payment Type": reservation.paymentType,
          "Staff Name": reservation.staffName,
          "Created At": dayjs(reservation.createdAt).format("DD/MM/YYYY HH:mm"),
          "Reservation Date": dayjs(reservation.date).format("DD/MM/YYYY"),
          Guests: reservation.guestsNumber,
          Status: reservation.status,
          Table: reservation.tableNumber,
          Customer: reservation.customerName,
          Total: `${reservation.total.toFixed(2)} MDL`,
        }));

        XLSX.utils.sheet_add_json(worksheet, reservationsRows, {
          origin: { r: titleData.length + 1, c: 0 },
        });

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          "Reservations Report"
        );
        XLSX.writeFile(
          workbook,
          `${restaurantName}-reservations-report-${dayjs().format(
            "YYYY-MM-DD"
          )}.xlsx`
        );
      } else if (type === "pdf") {
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        // Add title with restaurant name
        doc.setFontSize(20);
        doc.text(restaurantName, 15, 20);
        doc.setFontSize(16);
        doc.text("Reservations Report", 15, 30);
        doc.setFontSize(12);
        doc.text(`Generated: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 15, 40);

        // Format data for table
        const tableData = reservationsData.map((reservation) => [
          reservation.id.substring(0, 8) +
            "..." +
            reservation.id.substring(reservation.id.length - 8),
          reservation.paymentType,
          reservation.staffName,
          dayjs(reservation.createdAt).format("DD/MM/YYYY HH:mm"),
          dayjs(reservation.date).format("DD/MM/YYYY"),
          String(reservation.guestsNumber),
          reservation.status,
          reservation.tableNumber,
          reservation.customerName,
          `${reservation.total.toFixed(2)} MDL`,
        ]);

        // Configure and create table
        (doc as any).autoTable({
          head: [
            [
              "ID",
              "Payment Type",
              "Staff Name",
              "Created At",
              "Reservation Date",
              "Guests",
              "Status",
              "Table",
              "Customer",
              "Total",
            ],
          ],
          body: tableData,
          startY: 50,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 8,
            fontStyle: "bold",
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 15 },
            6: { cellWidth: 20 },
            7: { cellWidth: 20 },
            8: { cellWidth: 30 },
            9: { cellWidth: 25 },
          },
          margin: { top: 50 },
        });

        doc.save(
          `${restaurantName}-reservations-report-${dayjs().format(
            "YYYY-MM-DD"
          )}.pdf`
        );
      }

      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className={classes.CommonSalesContainer}>
      <div className={classes.SalesContainer}>
        <div className={classes.header}>
          <div className={classes.titleContainer}>
            <button
              className={classes.BackButton}
              onClick={() => navigate("/reporting")}
            >
              <span className={classes.LeftArrow}>{LeftArrow}</span>
            </button>
            <h1>Reservations</h1>
            {/* Time Period Selector and Search */}
            <div className={classes.timeControlsContainer}>
              <form
                onSubmit={handleSearchSubmit}
                className={classes.searchContainer}
              >
                <div className={classes.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Search by ID..."
                    value={searchId}
                    onChange={handleSearchChange}
                    className={classes.searchInput}
                  />
                  {searchId && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className={classes.clearButton}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button type="submit" className={classes.searchButton}>
                  Search
                </button>
              </form>
              <div className={classes.timePeriodSelector}>
                <label htmlFor="timePeriod">Period:</label>
                <select
                  id="timePeriod"
                  value={timePeriod}
                  onChange={(e) =>
                    handleTimePeriodChange(e.target.value as TimePeriod)
                  }
                  className={classes.timePeriodSelect}
                >
                  <option value="1_day">1 Day</option>
                  <option value="3_days">3 Days</option>
                  <option value="7_days">7 Days</option>
                  <option value="month">Month</option>
                  <option value="all_time">All Time</option>
                </select>
              </div>
            </div>
            {timePeriod !== "all_time" && datepicker}
          </div>
          <div className={classes.headerActions}>
            <div className={classes.exportWrapper}>
              <button
                className={classes.Export}
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              >
                {exportIcon}
                <span>Export</span>
              </button>
              {isExportMenuOpen && (
                <div className={classes.exportMenu}>
                  <div
                    className={classes.exportMenuItem}
                    onClick={() => handleExport("pdf")}
                  >
                    Export PDF
                  </div>
                  <div
                    className={classes.exportMenuItem}
                    onClick={() => handleExport("excel")}
                  >
                    Export Excel
                  </div>
                </div>
              )}
            </div>
            <NotificationButton />
          </div>
        </div>

        <div className={classes.tableContainer}>
          {showLoader ? (
            <div className={classes.loaderContainer}>
              <div className={classes.loader}></div>
              <p>Loading reservations data...</p>
            </div>
          ) : (
            <>
              <div className={classes.tableHeaderMain}>
                <div>ID</div>
                <div>Payment Type</div>
                <div>Staff Name</div>
                <div>Created At</div>
                <div>Reservation Date</div>
                <div>Guests</div>
                <div>Status</div>
                <div>Table</div>
                <div>Customer</div>
                <div>Total</div>
              </div>

              <div className={classes.tableBody}>
                {Array.isArray(reservationsData) &&
                reservationsData.length > 0 ? (
                  reservationsData.map((reservation, index) => (
                    <div key={index} className={classes.tableRow}>
                      <div
                        className={classes.clickableId}
                        onClick={() => handleReservationClick(reservation.id)}
                        title="Click to view details"
                      >
                        {reservation.id.substring(0, 8)}...
                        {reservation.id.substring(reservation.id.length - 8)}
                      </div>
                      <div>{reservation.paymentType}</div>
                      <div>{reservation.staffName}</div>
                      <div>
                        {dayjs(reservation.createdAt).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </div>
                      <div>{dayjs(reservation.date).format("DD/MM/YYYY")}</div>
                      <div>{reservation.guestsNumber}</div>
                      <div>{reservation.status}</div>
                      <div>{reservation.tableNumber}</div>
                      <div>{reservation.customerName}</div>
                      <div>{reservation.total.toFixed(2)} MDL</div>
                    </div>
                  ))
                ) : (
                  <div className={classes.noData}>No data available</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pagination Controls */}
        <div className={classes.paginationContainer}>
          <div className={classes.paginationInfo}>
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, paginationMeta.total)} of{" "}
              {paginationMeta.total} entries
            </span>
          </div>

          <div className={classes.paginationControls}>
            <div className={classes.pageSizeSelector}>
              <label htmlFor="pageSize">Show:</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className={classes.pageSizeSelect}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            {paginationMeta.totalPages > 1 && (
              <div className={classes.pageButtons}>
                <button
                  className={classes.pageButton}
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  First
                </button>
                <button
                  className={classes.pageButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!paginationMeta.hasPrev}
                >
                  Previous
                </button>

                <div className={classes.pageNumbers}>
                  {Array.from(
                    { length: Math.min(5, paginationMeta.totalPages) },
                    (_, i) => {
                      const startPage = Math.max(1, currentPage - 2);
                      const pageNum = startPage + i;
                      if (pageNum > paginationMeta.totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          className={`${classes.pageButton} ${
                            pageNum === currentPage ? classes.activePage : ""
                          }`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  className={classes.pageButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!paginationMeta.hasNext}
                >
                  Next
                </button>
                <button
                  className={classes.pageButton}
                  onClick={() => handlePageChange(paginationMeta.totalPages)}
                  disabled={currentPage === paginationMeta.totalPages}
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Detail Modal */}
      <ReservationDetailModal
        reservationId={selectedReservationId}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ReservationsReport;
