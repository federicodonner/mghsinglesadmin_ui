import texts from "../data/texts";

// Store data un LS
export function storeInLS(key, data) {
  localStorage.setItem(key, data);
}

// Read from LS
export function readFromLS(key) {
  return localStorage.getItem(key);
}

// Delete from LS
export function deleteFromLS(key) {
  return localStorage.removeItem(key);
}

// Operations for logging out the user.
//
// Tell the server to destroy this token BEFORE dropping it locally, so a
// logout actually ends the session instead of only forgetting it in this
// browser (the token used to stay valid in the database forever). Best-effort
// and fire-and-forget: the local removal must happen even if the network call
// fails, so the user is never stuck "logged in" on a flaky connection.
export function logout() {
  const token = localStorage.getItem(process.env.REACT_APP_LS_LOGIN_TOKEN);
  if (token) {
    try {
      fetch(process.env.REACT_APP_API_URL + "/oauth", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      /* ignore — local removal below is what matters */
    }
  }
  localStorage.removeItem(process.env.REACT_APP_LS_LOGIN_TOKEN);
}

// Access API
// With timeout specified in .env
// `options.timeout` overrides the configured request timeout for calls that
// legitimately take long — a ManaBox import processes a whole binder's scan
// card by card.
export function accessAPI(verb, endpoint, data, callbackSuccess, callbackFail, options = {}) {
  const url = process.env.REACT_APP_API_URL + "/" + endpoint;

  var accessToken = readFromLS(process.env.REACT_APP_LS_LOGIN_TOKEN);
  var fetchConfig = {
    method: verb,
    headers: {
      "accept-encoding": "gzip, deflate",
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    // Callers historically passed a pre-stringified body, so a plain object
    // was silently coerced to "[object Object]" and the API rejected it as
    // malformed JSON. Accept either.
    body:
      data === null || data === undefined || typeof data === "string"
        ? data
        : JSON.stringify(data),
  };
  Promise.race([
    // Generate two promies, one with the fecth and the other with the timeout
    // the one that finishes first resolves
    fetch(url, fetchConfig),
    new Promise(function (resolve, reject) {
      setTimeout(
        () => reject(new Error("request timeout")),
        options.timeout ?? process.env.REACT_APP_API_TIMEOUT
      );
    }),
  ])
    .then((response) => {
      // When race resolves, it verifies the status of the API response
      // If it's 200 or 201, it was successful, then the success callback is run
      if (response.status >= 200 && response.status < 300) {
        response.json().then((data) => {
          callbackSuccess(data);
        });
      } else {
        response.json().then((data) => {
          data.status = response.status;
          callbackFail(data);
        });
      }
    })
    .catch((e) => {
      var response = {
        status: 500,
        message: texts.API_ERROR,
      };
      callbackFail(response);
    });
}
