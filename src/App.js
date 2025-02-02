import React, { useState, useEffect } from "react";
import "./App.css";
import "./components/Loading.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import socket from "./services/socketService";

import Dashboard from "./pages/Dashboard";
import ScanMeja from "./pages/ScanMeja";
import LoginPage from "./pages/LoginPage";
import CafePage from "./pages/CafePage";
import SearchResult from "./pages/SearchResult";
import Cart from "./pages/Cart";
import Invoice from "./pages/Invoice";
import Transactions from "./pages/Transactions";
import Footer from "./components/Footer";

import GuestSideLogin from "./pages/GuestSideLogin";
import GuestSide from "./pages/GuestSide";
import { getItemTypesWithItems } from "./helpers/itemHelper.js";

import {
  getConnectedGuestSides,
  getClerks,
  removeConnectedGuestSides,
} from "./helpers/userHelpers.js";
import {
  getLocalStorage,
  removeLocalStorage,
} from "./helpers/localStorageHelpers";
import { calculateTotals } from "./helpers/cartHelpers";
import Modal from "./components/Modal"; // Import your modal component

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState([]);
  const [shopClerks, setShopClerks] = useState([]);
  const [guestSideOfClerk, setGuestSideOfClerk] = useState(null);
  const [guestSides, setGuestSides] = useState([]);
  const [shopId, setShopId] = useState("");
  const [tableId, setTableId] = useState("");
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [deviceType, setDeviceType] = useState("");
  const [shop, setShop] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  useEffect(() => {
    const calculateTotalsFromLocalStorage = () => {
      const { totalCount } = calculateTotals(shopId);
      setTotalItemsCount(totalCount);
    };

    calculateTotalsFromLocalStorage();

    const handleStorageChange = () => {
      calculateTotalsFromLocalStorage();
    };

    window.addEventListener("localStorageUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("localStorageUpdated", handleStorageChange);
    };
  }, [shopId]);

  const handleSetParam = ({ shopId, tableId }) => {
    console.log(shopId, tableId);
    setShopId(shopId);
    setTableId(tableId);
  };

  useEffect(() => {
    async function fetchData() {
      console.log("gettingItems");
      try {
        const { response, cafe, data } = await getItemTypesWithItems(shopId);
        if (response.status === 200) {
          setShop(cafe);
          setShopItems(data);
          socket.on("transaction_created", () => {
            console.log("transaction created");
          });
        }
      } catch (error) {
        console.error("Error fetching shop items:", error);
      }
    }

    if (shopId !== "") fetchData();
  }, [shopId]);

  const rmConnectedGuestSides = async (gueseSideSessionId) => {
    const sessionLeft = await removeConnectedGuestSides(gueseSideSessionId);
    setGuestSides(sessionLeft.guestSideList);
  };

  useEffect(() => {
    if (socket == null) return;

    if (getLocalStorage("authGuestSide")) {
      socket.emit("checkGuestSideToken", {
        token: getLocalStorage("authGuestSide"),
      });
    } else {
      socket.emit("checkUserToken", {
        token: getLocalStorage("auth"),
        shopId,
      });
    }

    //for guest
    socket.on("transaction_pending", async (data) => {
      console.log("transaction notification");
      setModal("transaction_pending");
    });
    socket.on("transaction_success", async (data) => {
      console.log("transaction notification");
      setModal("transaction_success");
    });

    //for clerk
    socket.on("transaction_created", async (data) => {
      console.log("transaction notification");
      setModal("new_transaction");
    });

    socket.on("checkUserTokenRes", async (data) => {
      if (data.status !== 200) {
        removeLocalStorage("auth");
        setDeviceType("guestDevice");
      } else {
        setUser(data.data.user);
        if (data.data.user.password == "unsetunsetunset")
          setModal("complete_account");
        if (data.data.user.cafeId == shopId) {
          const connectedGuestSides = await getConnectedGuestSides();
          setGuestSides(connectedGuestSides.sessionDatas);
          console.log("getting guest side");
          setDeviceType("clerk");
        } else {
          setDeviceType("guestDevice");
        }
        if (data.data.user.roleId == 1 && user.userId == shop.ownerId) {
          // shopClerks is can only be obtained by the shop owner
          // so every user that is admin will try to getting shopClerks, even not yet proven that this is their shop
          const shopClerks = await getClerks(shopId);
          setShopClerks(shopClerks);
        }
      }
    });

    socket.on("checkGuestSideTokenRes", (data) => {
      if (data.status !== 200) {
        removeLocalStorage("authGuestSide");
        navigate("/guest-side");
      } else {
        setGuestSideOfClerk({
          clerkId: data.sessionData.clerkId,
          clerkUsername: data.sessionData.clerkUsername,
        });
        setDeviceType("guestSide");
      }
    });

    socket.on("signout-guest-session", () => {
      navigate("/guest-side");
    });

    return () => {
      socket.off("signout-guest-session");
    };
  }, [socket, shopId]);

  const handleModalFromURL = () => {
    const queryParams = new URLSearchParams(location.search);
    const modal = queryParams.get("modal");
    if (modal) setModal(modal);
  };

  useEffect(() => {
    handleModalFromURL();
  }, [shopId]);

  useEffect(() => {
    console.log(shopId + tableId);
  }, [navigate]);

  // Function to open the modal
  const setModal = (content) => {
    setIsModalOpen(true);
    setModalContent(content);
    document.body.style.overflow = "hidden";
    navigate(`?modal=` + content, { replace: true });
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "auto";

    const queryParams = new URLSearchParams(location.search);

    // Remove the 'modal' parameter
    queryParams.delete("modal");

    // Update the URL without the 'modal' parameter
    navigate({ search: queryParams.toString() }, { replace: true });
  };

  return (
    <div className="App">
      <header className="App-header">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard user={user} socket={socket} setModal={setModal} />
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/scan"
            element={
              <>
                <ScanMeja
                  sendParam={handleSetParam}
                  shopName={shop.name}
                  shopOwnerId={shop.ownerId}
                  shopItems={shopItems}
                  shopClerks={shopClerks}
                  socket={socket}
                  user={user}
                  guestSides={guestSides}
                  guestSideOfClerk={guestSideOfClerk}
                  removeConnectedGuestSides={rmConnectedGuestSides}
                  setModal={setModal} // Pass the function to open modal
                />
              </>
            }
          />
          <Route
            path="/:shopId/:tableId?"
            element={
              <>
                <CafePage
                  sendParam={handleSetParam}
                  shopName={shop.name}
                  shopOwnerId={shop.ownerId}
                  shopItems={shopItems}
                  shopClerks={shopClerks}
                  socket={socket}
                  user={user}
                  guestSides={guestSides}
                  guestSideOfClerk={guestSideOfClerk}
                  removeConnectedGuestSides={rmConnectedGuestSides}
                  setModal={setModal} // Pass the function to open modal
                />
                <Footer
                  shopId={shopId}
                  tableId={tableId}
                  cartItemsLength={totalItemsCount}
                  selectedPage={0}
                />
              </>
            }
          />
          <Route
            path="/:shopId/:tableId?/search"
            element={
              <>
                <SearchResult
                  cafeId={shopId}
                  sendParam={handleSetParam}
                  user={user}
                  shopItems={shopItems}
                  guestSides={guestSides}
                  guestSideOfClerk={guestSideOfClerk}
                  removeConnectedGuestSides={rmConnectedGuestSides}
                  setModal={setModal} // Pass the function to open modal
                />
                <Footer
                  shopId={shopId}
                  tableId={tableId}
                  cartItemsLength={totalItemsCount}
                  selectedPage={1}
                />
              </>
            }
          />
          <Route
            path="/:shopId/:tableId?/cart"
            element={
              <>
                <Cart
                  sendParam={handleSetParam}
                  totalItemsCount={totalItemsCount}
                  deviceType={deviceType}
                />
                <Footer
                  shopId={shopId}
                  tableId={tableId}
                  cartItemsLength={totalItemsCount}
                  selectedPage={2}
                />
              </>
            }
          />
          <Route
            path="/:shopId/:tableId?/invoice"
            element={
              <>
                <Invoice
                  sendParam={handleSetParam}
                  socket={socket}
                  deviceType={deviceType}
                />
                <Footer
                  shopId={shopId}
                  tableId={tableId}
                  cartItemsLength={totalItemsCount}
                  selectedPage={2}
                />
              </>
            }
          />
          <Route
            path="/:shopId/:tableId?/transactions"
            element={
              <>
                <Transactions
                  sendParam={handleSetParam}
                  deviceType={deviceType}
                />
                <Footer
                  shopId={shopId}
                  tableId={tableId}
                  cartItemsLength={totalItemsCount}
                  selectedPage={3}
                />
              </>
            }
          />
          <Route
            path="/:shopId/guest-side-login"
            element={<GuestSideLogin shopId={shopId} socket={socket} />}
          />
          <Route path="/guest-side" element={<GuestSide socket={socket} />} />
        </Routes>
      </header>
      <Modal
        shopId={shopId}
        isOpen={isModalOpen}
        modalContent={modalContent}
        onClose={closeModal}
      />
    </div>
  );
}

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
