import API_BASE_URL from "../config.js";
import { getLocalStorage, updateLocalStorage } from "./localStorageHelpers";
import { getItemsByCafeId } from "../helpers/cartHelpers.js";

export async function confirmTransaction(transactionId) {
  try {
    const token = getLocalStorage("auth");
    const response = await fetch(
      `${API_BASE_URL}/transaction/confirm-transaction/${transactionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error:", error);
  }
}
export async function getTransactions(shopId, demand) {
  try {
    const token = getLocalStorage("auth");
    const response = await fetch(
      `${API_BASE_URL}/transaction/get-transactions/${shopId}?demandLength=${demand}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const transactions = await response.json();
    return transactions;
  } catch (error) {
    console.error("Error:", error);
  }
}

export const handlePaymentFromClerk = async (
  shopId,
  user_email,
  payment_type,
  serving_type,
  tableNo
) => {
  try {
    const token = getLocalStorage("auth");
    const items = getItemsByCafeId(shopId);

    const structuredItems = {
      items: items.map((item) => ({
        itemId: item.itemId,
        qty: item.qty,
      })),
    };

    console.log(items);
    const response = await fetch(
      API_BASE_URL + "/transaction/fromClerk/" + shopId,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_email: user_email,
          payment_type,
          serving_type,
          tableNo,
          transactions: structuredItems,
        }),
      }
    );

    if (response.ok) {
      // Handle success response
      console.log("Transaction successful!");
      // Optionally return response data or handle further actions upon success
      return true;
    } else {
      // Handle error response
      console.error("Transaction failed:", response.statusText);
      return false;
    }
  } catch (error) {
    console.error("Error sending transaction:", error);
    // Handle network or other errors
    return false;
  }
};

export const handlePaymentFromGuestSide = async (
  shopId,
  user_email,
  payment_type,
  serving_type,
  tableNo
) => {
  try {
    const token = getLocalStorage("authGuestSide");
    const items = getItemsByCafeId(shopId);

    const structuredItems = {
      items: items.map((item) => ({
        itemId: item.itemId,
        qty: item.qty,
      })),
    };

    console.log(items);
    const response = await fetch(
      API_BASE_URL + "/transaction/fromGuestSide/" + shopId,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_email: user_email,
          payment_type,
          serving_type,
          tableNo,
          transactions: structuredItems,
        }),
      }
    );
    const res = await response.json();
    console.log(res);
    if (response.ok) {
      // Handle success response
      console.log("Transaction successful!");
      // Optionally return response data or handle further actions upon success
      return true;
    } else {
      // Handle error response
      console.error("Transaction failed:", response.message);
      return false;
    }
  } catch (error) {
    console.error("Error sending transaction:", error);
    // Handle network or other errors
    return false;
  }
};

export const handlePaymentFromGuestDevice = async (
  shopId,
  payment_type,
  serving_type,
  tableNo,
  socketId
) => {
  try {
    const token = getLocalStorage("auth");
    const items = getItemsByCafeId(shopId);

    const structuredItems = {
      items: items.map((item) => ({
        itemId: item.itemId,
        qty: item.qty,
      })),
    };

    console.log(items);
    const response = await fetch(
      API_BASE_URL + "/transaction/fromGuestDevice/" + shopId,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_type,
          serving_type,
          tableNo,
          transactions: structuredItems,
          socketId,
        }),
      }
    );

    if (response.ok) {
      // Handle success response
      console.log("Transaction successful!");
      const data = await response.json();
      updateLocalStorage("auth", data.auth);
      // Optionally return response data or handle further actions upon success
      return true;
    } else {
      // Handle error response
      console.error("Transaction failed:", response.statusText);
      return false;
    }
  } catch (error) {
    console.error("Error sending transaction:", error);
    // Handle network or other errors
    return false;
  }
};
