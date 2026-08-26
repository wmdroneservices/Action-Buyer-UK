/* GearCashOut: compatibility alias for the live basket renderer. */
(function () {
  "use strict";

  window.moneyg = function (value) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(Number(value || 0));
  };
})();
