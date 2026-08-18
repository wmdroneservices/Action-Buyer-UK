document.addEventListener("DOMContentLoaded", function () {
"use strict";

const form = document.getElementById("quote-form");
const progressList = document.getElementById("progress-indicator");

if (!form) {
console.error("WE BUY ANY DRONE: #quote-form not found.");
return;
}

let steps = [];
let currentStep = 0;
let batteryCount = 0;

const quoteData = {
manufacturer: "",
model: "",
package: "",
condition: "",
flightHours: "",
flightHoursRange: "",
batteries: [],
unbound: "",
damage: "",
damageDescription: "",
packageContents: {},
additionalAccessories: [],
droneSerial: "",
controllerSerial: "",
photos: [],
legalRight: "",
fullName: "",
email: "",
phone: "",
addressLine1: "",
addressLine2: "",
city: "",
county: "",
postcode: "",
bankName: "",
accountNumber: "",
sortCode: "",
quoteAmount: null,
quoteReference: ""
};

const djiModels = {
mini: [
["mini", "DJI Mini"],
["mini-se", "DJI Mini SE"],
["mini-2", "DJI Mini 2"],
["mini-2-se", "DJI Mini 2 SE"],
["mini-3", "DJI Mini 3"],
["mini-3-pro", "DJI Mini 3 Pro"],
["mini-4-pro", "DJI Mini 4 Pro"],
["mini-5-pro", "DJI Mini 5 Pro"]
],
neo: [
["neo", "DJI Neo"],
["neo-2", "DJI Neo 2"]
],
lito: [
["lito-1", "DJI Lito 1"],
["lito-x1", "DJI Lito X1"]
],
flip: [
["flip", "DJI Flip"]
],
air: [
["air", "DJI Air"],
["air-2", "DJI Air 2"],
["air-2s", "DJI Air 2S"],
["air-3", "DJI Air 3"],
["air-3s", "DJI Air 3S"]
],
mavic: [
["mavic-mini", "DJI Mavic Mini"],
["mavic-pro", "DJI Mavic Pro"],
["mavic-2-pro", "DJI Mavic 2 Pro"],
["mavic-2-zoom", "DJI Mavic 2 Zoom"],
["mavic-3", "DJI Mavic 3"],
["mavic-3-classic", "DJI Mavic 3 Classic"],
["mavic-3-pro", "DJI Mavic 3 Pro"],
["mavic-3-pro-cine", "DJI Mavic 3 Pro Cine"],
["mavic-4-pro", "DJI Mavic 4 Pro"]
],
fpv: [
["fpv", "DJI FPV"],
["avata", "DJI Avata"],
["avata-2", "DJI Avata 2"],
["avata-360", "DJI Avata 360"]
],
commercial: [
["mavic-3-enterprise", "DJI Mavic 3 Enterprise"],
["mavic-3-thermal", "DJI Mavic 3 Thermal"],
["mavic-3-multispectral", "DJI Mavic 3 Multispectral"],
["matrice-4e", "DJI Matrice 4E"],
["matrice-4t", "DJI Matrice 4T"],
["matrice-30", "DJI Matrice 30"],
["matrice-30t", "DJI Matrice 30T"],
["matrice-300-rtk", "DJI Matrice 300 RTK"],
["matrice-350-rtk", "DJI Matrice 350 RTK"],
["matrice-400", "DJI Matrice 400"],
["inspire-1", "DJI Inspire 1"],
["inspire-2", "DJI Inspire 2"],
["inspire-3", "DJI Inspire 3"],
["agras", "DJI Agras"]
]
};

const packageOptions = {
"mini-5-pro": {
"drone-only": "Drone only",
"standard-rc-n3": "Standard + RC-N3",
"fly-more-rc-n3": "Fly More Combo + RC-N3",
"fly-more-rc-2": "Fly More Combo + RC 2",
"fly-more-plus-rc-2": "Fly More Combo Plus + RC 2"
},
"mini-4-pro": {
"drone-only": "Drone only",
"standard-rc-n2": "Standard + RC-N2",
"standard-rc-2": "Standard + RC 2",
"fly-more-rc-n2": "Fly More Combo + RC-N2",
"fly-more-rc-2": "Fly More Combo + RC 2"
},
"mini-3-pro": {
"drone-only": "Drone only",
"drone-rc-n1": "Drone + RC-N1",
"drone-dji-rc": "Drone + DJI RC",
"fly-more-rc-n1": "Fly More Combo + RC-N1",
"fly-more-dji-rc": "Fly More Combo + DJI RC"
},
"mini-3": {
"drone-only": "Drone only",
"standard-rc-n1": "Standard + RC-N1",
"fly-more-rc-n1": "Fly More Combo + RC-N1"
},
"mini-2": {
"drone-only": "Drone only",
"standard-rc-n1": "Standard + RC-N1",
"fly-more": "Fly More Combo"
},
"neo": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"neo-2": {
"standard": "Standard Package",
"fly-more": "Fly More Combo"
},
"flip": {
"standard-rc-n3": "Standard + RC-N3",
"fly-more-rc-n3": "Fly More Combo + RC-N3",
"fly-more-rc-2": "Fly More Combo + RC 2"
},
"air": {
"drone-only": "Drone only",
"standard": "Standard Package",
"fly-more": "Fly More Combo"
},
"air-2": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"air-2s": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"air-3": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"air-3s": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"mavic-2-pro": {
"drone-only": "Drone only",
"standard": "Standard Package",
"fly-more": "Fly More Combo"
},
"mavic-2-zoom": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"mavic-3": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"mavic-3-classic": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"mavic-3-pro": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"mavic-3-pro-cine": {
"drone-only": "Drone only",
"premium-combo": "Premium Combo"
},
"mavic-4-pro": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
},
"fpv": {
"drone-only": "Drone only",
"fly-smart": "Fly Smart Combo"
},
"avata": {
"drone-only": "Drone only",
"fly-smart": "Fly Smart Combo",
"pro-view": "Pro-View Combo",
"explorer": "Explorer Combo"
},
"avata-2": {
"drone-only": "Drone only",
"fly-more": "Fly More Combo"
}
};

const packageSpecs = {
"mini-5-pro": {
"fly-more-rc-2": {
batteries: 3
}
},
"mini-4-pro": {
"fly-more-rc-2": {
batteries: 3
},
"fly-more-rc-n2": {
batteries: 3
}
},
"mini-3-pro": {
"fly-more-rc-n1": {
batteries: 3
},
"fly-more-dji-rc": {
batteries: 3
}
},
"mini-3": {
"fly-more-rc-n1": {
batteries: 3
}
},
"mini-2": {
"fly-more": {
batteries: 3
}
},
"neo": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"neo-2": {
"standard": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"flip": {
"standard-rc-n3": {
batteries: 1
},
"fly-more-rc-n3": {
batteries: 3
},
"fly-more-rc-2": {
batteries: 3
}
},
"air": {
"drone-only": {
batteries: 1
},
"standard": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"air-2": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"air-2s": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"air-3": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"air-3s": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-2-pro": {
"drone-only": {
batteries: 1
},
"standard": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-2-zoom": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-3": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-3-classic": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-3-pro": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"mavic-3-pro-cine": {
"drone-only": {
batteries: 1
},
"premium-combo": {
batteries: 3
}
},
"mavic-4-pro": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
},
"fpv": {
"drone-only": {
batteries: 1
},
"fly-smart": {
batteries: 1
}
},
"avata": {
"drone-only": {
batteries: 1
},
"fly-smart": {
batteries: 2
},
"pro-view": {
batteries: 2
},
"explorer": {
batteries: 2
}
},
"avata-2": {
"drone-only": {
batteries: 1
},
"fly-more": {
batteries: 3
}
}
};

const pricing = {
"mini-5-pro": {
"fly-more-rc-2": {
basePrice: 500,
floorPrice: 250,
flightDeductions: {
"0-5": 0,
"5-20": 0,
"20-50": 25,
"50-100": 50,
"100-150": 100,
"150-200": 150,
"200+": null
},
conditionRules: {
"factory-sealed": 0,
"opened-unused": 0,
"excellent": 0,
"good": 25,
"fair": 75,
"damaged": 150,
"not-working": null
},
batteryRules: {
"0-50": 0,
"51-100": 5,
"101-200": 15,
"201-300": 30,
"301+": 50
},
missingItems: {
"drone": 500,
"controller": 100,
"charging-hub": 25,
"bag": 20,
"propellers": 10,
"power-supply": 20,
"cables": 10
},
extras: {
"battery": 30,
"controller": 50,
"charging-hub": 20
},
maxAdditionalBatteries: 3
}
}
};

function refreshSteps() {
steps = Array.from(form.querySelectorAll(".wizard-step"));
}

function stepIndex(number) {
refreshSteps();
return steps.findIndex(function (step) {
return Number(step.dataset.step) === number;
});
}

function escapeHTML(value) {
return String(value === null || value === undefined ? "" : value)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

function formatMoney(value) {
return new Intl.NumberFormat("en-GB", {
style: "currency",
currency: "GBP"
}).format(value);
}

function getModelName(id) {
for (const group of Object.values(djiModels)) {
for (const item of group) {
if (item[0] === id) {
return item[1];
}
}
}
return id;
}

function getPackageName(model, packageId) {
if (packageOptions[model] && packageOptions[model][packageId]) {
return packageOptions[model][packageId];
}
return packageId;
}

function getFlightRange(hours) {
const h = Number(hours);

if (!Number.isFinite(h)) {
return "";
}

if (h <= 5) {
return "0-5";
}

if (h <= 20) {
return "5-20";
}

if (h <= 50) {
return "20-50";
}

if (h <= 100) {
return "50-100";
}

if (h <= 150) {
return "100-150";
}

if (h <= 200) {
return "150-200";
}

return "200+";
}

function generateQuoteReference() {
return "WBA-" +
new Date().getFullYear() +
"-" +
Math.floor(100000 + Math.random() * 900000);
}

function navigationHTML(backText, nextText) {
return `
<div class="navigation-buttons">
<button type="button" class="btn-back">
${escapeHTML(backText || "Back")}
</button>
<button type="button" class="btn-next">
${escapeHTML(nextText || "Next")}
</button>
</div>
`;
}

function createStep(number, html) {
const section = document.createElement("section");
section.className = "wizard-step";
section.dataset.step = String(number);
section.hidden = true;
section.innerHTML = html;
form.appendChild(section);
return section;
}

function ensureLaterSteps() {
refreshSteps();

const existing = new Set(
steps.map(function (step) {
return Number(step.dataset.step);
})
);

if (!existing.has(7)) {
createStep(7, `
<h3>Step 7: Unbound Status</h3>
<p>Is the drone unbound from your DJI account?</p>
<fieldset>
<legend>DJI account status</legend>
<label><input type="radio" name="unbound" value="yes"> Yes</label>
<label><input type="radio" name="unbound" value="no"> No</label>
<label><input type="radio" name="unbound" value="unknown"> I Don't Know</label>
</fieldset>
<p>Please provide a screenshot or photograph showing the aircraft is unbound where possible.</p>
${navigationHTML()}
`);
}

if (!existing.has(8)) {
createStep(8, `
<h3>Step 8: Damage</h3>
<p>Does the drone have any damage?</p>
<fieldset>
<legend>Damage status</legend>
<label><input type="radio" name="damage" value="no"> No</label>
<label><input type="radio" name="damage" value="yes"> Yes</label>
</fieldset>
<div id="damage-details" hidden>
<label for="damage-description">Description of damage</label>
<textarea id="damage-description" rows="5" placeholder="Please describe all damage."></textarea>
<p>Examples: cracked body, damaged arm, damaged gimbal, damaged camera, scratches, propeller damage, landing damage, water damage or other faults.</p>
<label for="damage-photos">Damage photographs</label>
<input type="file" id="damage-photos" accept="image/*" multiple>
</div>
${navigationHTML()}
`);
}

if (!existing.has(9)) {
createStep(9, `
<h3>Step 9: Package Contents</h3>
<p>Please confirm what is present or missing from the selected package.</p>
<div id="package-contents-list"></div>
<hr>
<h4>Additional Equipment / Accessories</h4>
<p>Use this section for genuine extra equipment not already included in the selected package.</p>
<div id="additional-accessories-list"></div>
<button type="button" class="btn" id="add-accessory-btn">Add Accessory</button>
${navigationHTML()}
`);
}

if (!existing.has(10)) {
createStep(10, `
<h3>Step 10: Serial Numbers</h3>
<label for="drone-serial-number">Drone Serial Number</label>
<input type="text" id="drone-serial-number" maxlength="50" required>
<label for="controller-serial-number">Controller Serial Number</label>
<input type="text" id="controller-serial-number" maxlength="50">
<p>Serial numbers may be checked during inspection and ownership verification.</p>
${navigationHTML()}
`);
}

if (!existing.has(11)) {
createStep(11, `
<h3>Step 11: Photographs</h3>
<p>Upload clear photographs to help us verify your equipment.</p>
<ul>
<li>Drone</li>
<li>Controller</li>
<li>Package contents</li>
<li>Flight-time information</li>
<li>Battery-cycle information</li>
<li>Unbound status</li>
<li>Damage where applicable</li>
<li>Serial numbers where possible</li>
</ul>
<label for="photo-uploads">Upload photographs</label>
<input type="file" id="photo-uploads" accept="image/*" multiple required>
<p><strong>Do you have the legal right to sell this equipment?</strong></p>
<fieldset>
<label><input type="radio" name="legalRight" value="yes"> Yes</label>
<label><input type="radio" name="legalRight" value="no"> No</label>
<label><input type="radio" name="legalRight" value="not-sure"> I'm not sure</label>
</fieldset>
${navigationHTML()}
`);
}

if (!existing.has(12)) {
createStep(12, `
<h3>Your Instant Quote</h3>
<div id="quote-summary"></div>
<div class="quote-important">
<h4>IMPORTANT</h4>
<p>Your Instant Quote is based on the information and photographs you have provided.</p>
<p>All equipment is physically inspected when received.</p>
<p>If the equipment matches the information supplied, we will confirm the quoted price.</p>
<p>If the condition, contents, flight time, ownership or other information differs materially, we may make a revised final offer.</p>
<p>If you do not accept a revised offer, we will return the equipment to the full address you provide.</p>
</div>
<div class="navigation-buttons">
<button type="button" class="btn-back">Back</button>
<button type="button" class="btn-accept">Accept Instant Quote &amp; Continue</button>
</div>
`);
}

if (!existing.has(13)) {
createStep(13, `
<h3>Step 13: Your Details</h3>
<p>We require your full return address because your equipment is physically inspected after receipt. If you reject a revised final valuation, we need to be able to return your equipment to you.</p>
<label for="full-name">Full Name</label>
<input type="text" id="full-name" required>
<label for="email-address">Email Address</label>
<input type="email" id="email-address" required>
<label for="phone-number">Telephone Number</label>
<input type="tel" id="phone-number" required>
<fieldset>
<legend>Full Return Address</legend>
<label for="address-line-1">Address Line 1</label>
<input type="text" id="address-line-1" required>
<label for="address-line-2">Address Line 2</label>
<input type="text" id="address-line-2">
<label for="city">Town / City</label>
<input type="text" id="city" required>
<label for="county">County</label>
<input type="text" id="county" required>
<label for="postcode">Postcode</label>
<input type="text" id="postcode" required>
</fieldset>
${navigationHTML("Back", "Submit Quote")}
`);
}

if (!existing.has(14)) {
createStep(14, `
<h3>Quote Submitted</h3>
<p>Your quote reference:</p>
<p id="quote-reference" class="quote-ref"></p>
<p>Your quote information has been recorded on this device for this prototype.</p>
<p><strong>BACKEND INTEGRATION REQUIRED</strong></p>
<p>A production version will send the confirmation directly to the business system and customer email address.</p>
${navigationHTML("Back", "Continue to Shipping Instructions")}
`);
}

if (!existing.has(15)) {
createStep(15, `
<h3>Shipping Instructions</h3>
<h4>Shipping Label</h4>
<p>Your shipping label and instructions will be sent directly to the email address you supplied.</p>
<p><strong>BACKEND / SHIPPING PROVIDER INTEGRATION REQUIRED</strong></p>
<p>A live version can connect to Royal Mail or another approved courier to generate the shipping label.</p>
<p>Do not send the equipment until you have received the shipping instructions.</p>
${navigationHTML("Back", "Continue")}
`);
}

if (!existing.has(16)) {
createStep(16, `
<h3>Step 16: Final Inspection</h3>
<p>When your equipment arrives, we will inspect:</p>
<ol>
<li>Model</li>
<li>Serial number</li>
<li>Flight time</li>
<li>Battery cycles</li>
<li>Condition</li>
<li>Damage</li>
<li>Package contents</li>
<li>Unbound status</li>
<li>Final valuation</li>
</ol>
<h3>Final Offer</h3>
<p>After inspection you will receive a final offer.</p>
<p>You can accept or decline the final offer.</p>
<div class="navigation-buttons">
<button type="button" class="btn-final-accept">Accept Final Offer</button>
<button type="button" class="btn-final-decline">Decline Final Offer</button>
</div>
<div id="final-offer-result" hidden></div>
`);
}

refreshSteps();
}

function showStep(number) {
refreshSteps();

const index = stepIndex(number);

if (index < 0) {
return;
}

steps.forEach(function (step, i) {
step.hidden = i !== index;
});

currentStep = index;

if (progressList) {
progressList.querySelectorAll(".progress-step").forEach(function (item, i) {
if (i === index) {
item.setAttribute("aria-current", "step");
} else {
item.removeAttribute("aria-current");
}
});
}

window.scrollTo({
top: 0,
behavior: "smooth"
});

if (number === 6) {
ensureBatterySection();
}

if (number === 9) {
populatePackageContents();
}

if (number === 12) {
renderQuoteSummary();
}

if (number === 14) {
renderSubmittedQuote();
}
}

function validateManufacturer() {
const selected = form.querySelector('input[name="manufacturer"]:checked');

if (!selected) {
alert("Please select a manufacturer.");
return false;
}

quoteData.manufacturer = selected.value;
return true;
}

function populateModels() {
const select = document.getElementById("dji-model");

if (!select) {
return;
}

const previous = quoteData.model;

select.innerHTML = '<option value="">-- Select a DJI model --</option>';

Object.values(djiModels).flat().forEach(function (item) {
const option = document.createElement("option");
option.value = item[0];
option.textContent = item[1];
select.appendChild(option);
});

if (previous) {
select.value = previous;
}
}

function validateModel() {
const select = document.getElementById("dji-model");

if (!select || !select.value) {
alert("Please select your DJI model.");
return false;
}

quoteData.model = select.value;
return true;
}

function populatePackages() {
const select = document.getElementById("package-select");

if (!select) {
return;
}

const options = packageOptions[quoteData.model] || {
standard: "Standard Package"
};

const previous = quoteData.package;

select.innerHTML = '<option value="">-- Select package --</option>';

Object.entries(options).forEach(function (entry) {
const id = entry[0];
const name = entry[1];
const option = document.createElement("option");
option.value = id;
option.textContent = name;
select.appendChild(option);
});

if (previous && options[previous]) {
select.value = previous;
}
}

function validatePackage() {
const select = document.getElementById("package-select");

if (!select || !select.value) {
alert("Please select the exact package.");
return false;
}

quoteData.package = select.value;
return true;
}

function validateCondition() {
const selected = form.querySelector('input[name="condition"]:checked');

if (!selected) {
alert("Please select the condition of the drone.");
return false;
}

quoteData.condition = selected.value;
return true;
}

function validateFlight() {
const input = document.getElementById("flight-hours");
const range = form.querySelector('input[name="flightHoursRange"]:checked');
const value = input ? input.value.trim() : "";

if (!value && !range) {
alert("Please enter the flight hours or select a flight-time range.");
return false;
}

if (value) {
const number = Number(value);

if (!Number.isFinite(number) || number < 0) {
alert("Please enter a valid flight-hour figure.");
return false;
}

quoteData.flightHours = number;
quoteData.flightHoursRange = getFlightRange(number);
} else {
quoteData.flightHours = "";
quoteData.flightHoursRange = range.value;
}

return true;
}

function getBatteryContainer() {
let container = document.getElementById("batteries-container");

const step6 = steps.find(function (step) {
return Number(step.dataset.step) === 6;
});

if (!container && step6) {
container = document.createElement("div");
container.id = "batteries-container";

const addButton = step6.querySelector("#add-battery-btn");

if (addButton) {
step6.insertBefore(container, addButton);
} else {
step6.prepend(container);
}
}

return container;
}

function expectedBatteryCount() {
const spec =
packageSpecs[quoteData.model] &&
packageSpecs[quoteData.model][quoteData.package];

if (spec && spec.batteries) {
return spec.batteries;
}

return 1;
}

function updateBatteryNotice() {
const step6 = steps.find(function (step) {
return Number(step.dataset.step) === 6;
});

if (!step6) {
return;
}

let notice = step6.querySelector(".battery-package-note");

if (!notice) {
notice = document.createElement("p");
notice.className = "battery-package-note";

const container = getBatteryContainer();

if (container) {
step6.insertBefore(notice, container);
}
}

const count = expectedBatteryCount();

notice.innerHTML =
"The selected package normally includes <strong>" +
count +
"</strong> battery" +
(count === 1 ? "" : "ies") +
". Enter every battery you are sending. Any batteries beyond the package allowance are treated as additional batteries for valuation.";
}

function ensureBatterySection() {
const container = getBatteryContainer();

if (!container) {
return;
}

updateBatteryNotice();

if (!container.querySelector(".battery-entry")) {
createBatteryEntry();
}

const step6 = steps.find(function (step) {
return Number(step.dataset.step) === 6;
});

if (step6 && !step6.querySelector("#battery-cycle-photo")) {
const label = document.createElement("label");
label.htmlFor = "battery-cycle-photo";
label.textContent = "Battery cycle photograph / screenshot";

const input = document.createElement("input");
input.type = "file";
input.id = "battery-cycle-photo";
input.accept = "image/*";
input.multiple = true;

const navigation = step6.querySelector(".navigation-buttons");

step6.insertBefore(label, navigation);
step6.insertBefore(input, navigation);
}
}

function createBatteryEntry() {
const container = getBatteryContainer();

if (!container) {
return;
}

batteryCount++;

const wrapper = document.createElement("div");
wrapper.className = "battery-entry";
wrapper.dataset.number = String(batteryCount);

wrapper.innerHTML = `
<h4>Battery ${batteryCount}</h4>
<label for="battery-type-${batteryCount}">Battery Type</label>
<input type="text" id="battery-type-${batteryCount}" class="battery-type" placeholder="Example: Intelligent Flight Battery">
<label for="battery-cycles-${batteryCount}">Battery Cycle Count</label>
<input type="number" id="battery-cycles-${batteryCount}" class="battery-cycles" min="0" step="1" placeholder="0">
<button type="button" class="btn-remove-battery">Remove Battery</button>
`;

container.appendChild(wrapper);
}

function validateBatteries() {
const container = getBatteryContainer();

if (!container) {
alert("Battery section could not be found.");
return false;
}

const batteries = Array.from(
container.querySelectorAll(".battery-entry")
);

if (!batteries.length) {
alert("Please add at least one battery.");
return false;
}

const collected = [];

for (const battery of batteries) {
const typeInput = battery.querySelector(".battery-type");
const cycleInput = battery.querySelector(".battery-cycles");

const type = typeInput ? typeInput.value.trim() : "";
const cycles = cycleInput ? cycleInput.value.trim() : "";

if (!type) {
alert("Please enter the battery type for every battery.");
return false;
}

if (
cycles === "" ||
!Number.isFinite(Number(cycles)) ||
Number(cycles) < 0
) {
alert("Please enter a valid battery cycle count for every battery.");
return false;
}

collected.push({
type: type,
cycles: Number(cycles)
});
}

quoteData.batteries = collected;
return true;
}

function validateUnbound() {
const selected = form.querySelector('input[name="unbound"]:checked');

if (!selected) {
alert("Please tell us whether the drone is unbound.");
return false;
}

quoteData.unbound = selected.value;

if (selected.value === "no") {
alert("The aircraft normally needs to be unbound before a standard purchase can proceed. Your submission can still be reviewed manually.");
}

return true;
}

function validateDamage() {
const selected = form.querySelector('input[name="damage"]:checked');

if (!selected) {
alert("Please tell us whether the drone has damage.");
return false;
}

quoteData.damage = selected.value;

const description = document.getElementById("damage-description");

quoteData.damageDescription =
description ? description.value.trim() : "";

return true;
}

function populatePackageContents() {
const container = document.getElementById("package-contents-list");

if (!container) {
return;
}

container.innerHTML = "";

const batteryCountForPackage = expectedBatteryCount();

const items = [
{
id: "drone",
name: "Drone"
},
{
id: "controller",
name: "Controller"
}
];

for (let i = 1; i <= batteryCountForPackage; i++) {
items.push({
id: "battery-" + i,
name: "Battery " + i
});
}

items.push(
{
id: "charging-hub",
name: "Charging Hub"
},
{
id: "bag",
name: "Bag"
},
{
id: "propellers",
name: "Propellers"
},
{
id: "power-supply",
name: "Power Supply"
},
{
id: "cables",
name: "Cables"
}
);

items.forEach(function (item) {
const row = document.createElement("div");
row.className = "package-content-row";

row.innerHTML = `
<label for="contents-${escapeHTML(item.id)}">
${escapeHTML(item.name)}
</label>
<select
id="contents-${escapeHTML(item.id)}"
class="package-content-select"
data-content-id="${escapeHTML(item.id)}"
>
<option value="">-- Select status --</option>
<option value="present">Present</option>
<option value="missing">Missing</option>
</select>
`;

container.appendChild(row);
});

renderAccessories();
}

function renderAccessories() {
const container =
document.getElementById("additional-accessories-list");

if (!container) {
return;
}

container.innerHTML = "";

quoteData.additionalAccessories.forEach(function (accessory, index) {
const row = document.createElement("div");
row.className = "additional-accessory-row";

row.innerHTML = `
<label>
Accessory ${index + 1}
<input
type="text"
class="accessory-name"
data-index="${index}"
value="${escapeHTML(accessory.name)}"
placeholder="e.g. DJI ND filter set"
>
</label>
<label>
Quantity
<input
type="number"
class="accessory-qty"
data-index="${index}"
min="1"
step="1"
value="${Number(accessory.quantity) || 1}"
>
</label>
<button
type="button"
class="btn-remove-accessory"
data-index="${index}"
>
Remove
</button>
`;

container.appendChild(row);
});
}

function addAccessory() {
quoteData.additionalAccessories.push({
name: "",
quantity: 1
});

renderAccessories();
}

function validatePackageContents() {
const selects = Array.from(
document.querySelectorAll(".package-content-select")
);

const contents = {};

for (const select of selects) {
if (!select.value) {
alert("Please mark each package item as Present or Missing.");
return false;
}

contents[select.dataset.contentId] = select.value;
}

const accessories = [];

document.querySelectorAll(".additional-accessory-row").forEach(function (row) {
const name =
row.querySelector(".accessory-name").value.trim();

const quantity =
Number(row.querySelector(".accessory-qty").value);

if (name) {
accessories.push({
name: name,
quantity:
Number.isFinite(quantity) && quantity > 0
? Math.floor(quantity)
: 1
});
}
});

quoteData.packageContents = contents;
quoteData.additionalAccessories = accessories;

return true;
}

function validateSerialNumbers() {
const drone =
document.getElementById("drone-serial-number");

const controller =
document.getElementById("controller-serial-number");

if (!drone || !drone.value.trim()) {
alert("Please enter the drone serial number.");
return false;
}

quoteData.droneSerial = drone.value.trim();
quoteData.controllerSerial =
controller ? controller.value.trim() : "";

return true;
}

function validatePhotos() {
const input =
document.getElementById("photo-uploads");

if (
!input ||
!input.files ||
input.files.length === 0
) {
alert("Please upload at least one photograph.");
return false;
}

quoteData.photos = Array.from(input.files);

return true;
}

function calculateBatteryDeduction(packagePricing) {
if (!packagePricing || !packagePricing.batteryRules) {
return 0;
}

let deduction = 0;

quoteData.batteries.forEach(function (battery) {
const cycles = Number(battery.cycles);

if (cycles <= 50) {
return;
}

if (cycles <= 100) {
deduction += packagePricing.batteryRules["51-100"] || 0;
} else if (cycles <= 200) {
deduction += packagePricing.batteryRules["101-200"] || 0;
} else if (cycles <= 300) {
deduction += packagePricing.batteryRules["201-300"] || 0;
} else {
deduction += packagePricing.batteryRules["301+"] || 0;
}
});

return deduction;
}

function calculateMissingItemDeduction(packagePricing) {
if (!packagePricing || !packagePricing.missingItems) {
return 0;
}

let deduction = 0;

Object.entries(quoteData.packageContents).forEach(function (entry) {
const item = entry[0];
const status = entry[1];

if (status === "missing") {
deduction += packagePricing.missingItems[item] || 0;
}
});

return deduction;
}

function calculateAdditionalBatteryValue(packagePricing) {
if (!packagePricing || !packagePricing.extras) {
return 0;
}

const included = expectedBatteryCount();
const totalBatteries = quoteData.batteries.length;
const additional = Math.max(0, totalBatteries - included);
const maximum = packagePricing.maxAdditionalBatteries || 0;
const allowed = Math.min(additional, maximum);
const valuePerBattery = packagePricing.extras.battery || 0;

return allowed * valuePerBattery;
}

function calculateInstantQuote() {
const model = quoteData.model;
const packageId = quoteData.package;
const modelPricing = pricing[model];

if (!modelPricing) {
return {
status: "manual",
amount: null,
reason: "This model has not yet been given a verified automatic purchase price."
};
}

const packagePricing = modelPricing[packageId];

if (!packagePricing || !packagePricing.basePrice) {
return {
status: "manual",
amount: null,
reason: "A verified purchase price has not yet been entered for this package."
};
}

if (
quoteData.unbound === "no" ||
quoteData.unbound === "unknown"
) {
return {
status: "manual",
amount: null,
reason: "The drone's DJI account status requires manual review."
};
}

if (quoteData.condition === "not-working") {
return {
status: "manual",
amount: null,
reason: "Non-working / spares-only equipment requires manual parts valuation."
};
}

if (quoteData.condition === "damaged") {
return {
status: "manual",
amount: null,
reason: "Damaged equipment requires manual damage valuation."
};
}

const range =
quoteData.flightHours !== ""
? getFlightRange(quoteData.flightHours)
: quoteData.flightHoursRange;

if (
range === "200+" &&
packagePricing.flightDeductions["200+"] === null
) {
return {
status: "manual",
amount: null,
reason: "Very high flight time requires manual valuation."
};
}

let price = Number(packagePricing.basePrice);

const flightDeduction =
packagePricing.flightDeductions[range] || 0;

let conditionDeduction = 0;

if (
Object.prototype.hasOwnProperty.call(
packagePricing.conditionRules,
quoteData.condition
)
) {
conditionDeduction =
packagePricing.conditionRules[quoteData.condition];

if (conditionDeduction === null) {
return {
status: "manual",
amount: null,
reason: "This condition requires manual valuation."
};
}
}

const batteryDeduction =
calculateBatteryDeduction(packagePricing);

const missingDeduction =
calculateMissingItemDeduction(packagePricing);

const additionalBatteryValue =
calculateAdditionalBatteryValue(packagePricing);

price -= flightDeduction;
price -= batteryDeduction;
price -= conditionDeduction;
price -= missingDeduction;
price += additionalBatteryValue;

price = Math.min(price, packagePricing.basePrice);

if (
typeof packagePricing.floorPrice === "number" &&
price < packagePricing.floorPrice
) {
return {
status: "manual",
amount: null,
reason: "The calculated value is below the automatic purchase floor."
};
}

return {
status: "automatic",
amount: Math.round(price * 100) / 100,
basePrice: packagePricing.basePrice,
flightDeduction: flightDeduction,
batteryDeduction: batteryDeduction,
conditionDeduction: conditionDeduction,
missingDeduction: missingDeduction,
additionalBatteryValue: additionalBatteryValue
};
}

function renderQuoteSummary() {
    const summary = document.getElementById("quote-summary");

    if (!summary) {
        return;
    }

    const result = calculateInstantQuote();

    quoteData.quoteAmount = result.amount;

    const title = document.getElementById("quote-result-title");
    const importantHeading =
        document.getElementById("quote-important-heading");
    const importantContent =
        document.getElementById("quote-important-content");

    const actionButton =
        document.getElementById("quote-result-action") ||
        document.querySelector('[data-step="12"] .btn-accept');

    let html = `
        <p>
            <strong>
                ${escapeHTML(getModelName(quoteData.model))}
            </strong>
        </p>

        <p>
            <strong>Package:</strong>
            ${escapeHTML(
                getPackageName(
                    quoteData.model,
                    quoteData.package
                )
            )}
        </p>

        <p>
            <strong>Condition:</strong>
            ${escapeHTML(quoteData.condition)}
        </p>

        <p>
            <strong>Flight time:</strong>
            ${
                quoteData.flightHours !== ""
                    ? escapeHTML(quoteData.flightHours) + " hours"
                    : escapeHTML(quoteData.flightHoursRange)
            }
        </p>

        <p>
            <strong>Batteries:</strong>
            ${quoteData.batteries.length}
        </p>
    `;

    if (result.status === "automatic") {

        if (title) {
            title.textContent = "Your Instant Quote";
        }

        if (importantHeading) {
            importantHeading.textContent = "IMPORTANT";
        }

        if (importantContent) {
            importantContent.innerHTML = `
                <p>
                    Your Instant Quote is based on the information
                    and photographs you have provided.
                </p>

                <p>
                    All equipment is physically inspected when received.
                </p>

                <p>
                    If the equipment matches the information supplied,
                    we will confirm the quoted price.
                </p>

                <p>
                    If the condition, contents, flight time, ownership
                    or other information differs materially, we may
                    make a revised final offer.
                </p>

                <p>
                    If you do not accept a revised offer, we will return
                    the equipment to the full address you provide.
                </p>
            `;
        }

        if (actionButton) {
            actionButton.textContent =
                "Accept Instant Quote & Continue";

            actionButton.classList.add("btn-accept");

            actionButton.dataset.quoteAction = "accept";
        }

        html += `
            <div class="quote-price-box">

                <h3>Estimated purchase price</h3>

                <p
                    class="quote-price"
                    style="font-size:2.4rem;font-weight:800;margin:.5rem 0;"
                >
                    ${formatMoney(result.amount)}
                </p>

                <p>
                    This is the current automatic purchase quote
                    based on the information supplied.
                </p>

            </div>
        `;

    } else {

        if (title) {
            title.textContent =
                "Manual Validation Required";
        }

        if (importantHeading) {
            importantHeading.textContent = "IMPORTANT";
        }

        if (importantContent) {
            importantContent.innerHTML = `
                <p>
                    We need to manually assess this equipment
                    before confirming a purchase price.
                </p>

                <p>
                    Your information and photographs will be
                    reviewed by our team.
                </p>

                <p>
                    Once the review is complete, we will contact
                    you with the valuation.
                </p>
            `;
        }

        if (actionButton) {
            actionButton.textContent =
                "Continue to Manual Review";

            actionButton.classList.remove("btn-accept");

            actionButton.dataset.quoteAction = "manual";
        }

        html += `
            <div class="manual-valuation-box">

                <h3>MANUAL VALIDATION REQUIRED</h3>

                <p>
                    We need to manually assess this equipment
                    before confirming a purchase price.
                </p>

                <p>
                    <strong>Reason:</strong>
                    ${escapeHTML(result.reason)}
                </p>

                <p>
                    Your information can still be submitted
                    for review.
                </p>

            </div>
        `;
    }

    summary.innerHTML = html;
}

function validateCustomerDetails() {
const fullName =
document.getElementById("full-name");

const email =
document.getElementById("email-address");

const phone =
document.getElementById("phone-number");

const address1 =
document.getElementById("address-line-1");

const address2 =
document.getElementById("address-line-2");

const city =
document.getElementById("city");

const county =
document.getElementById("county");

const postcode =
document.getElementById("postcode");

if (!fullName || !fullName.value.trim()) {
alert("Please enter your full name.");
return false;
}

if (
!email ||
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
email.value.trim()
)
) {
alert("Please enter a valid email address.");
return false;
}

if (!phone || !phone.value.trim()) {
alert("Please enter your telephone number.");
return false;
}

if (!address1 || !address1.value.trim()) {
alert("Please enter Address Line 1.");
return false;
}

if (!city || !city.value.trim()) {
alert("Please enter your town or city.");
return false;
}

if (!county || !county.value.trim()) {
alert("Please enter your county.");
return false;
}

if (
!postcode ||
!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(
postcode.value.trim()
)
) {
alert("Please enter a valid UK postcode.");
return false;
}

quoteData.fullName = fullName.value.trim();
quoteData.email = email.value.trim();
quoteData.phone = phone.value.trim();
quoteData.addressLine1 = address1.value.trim();
quoteData.addressLine2 =
address2 ? address2.value.trim() : "";
quoteData.city = city.value.trim();
quoteData.county = county.value.trim();
quoteData.postcode =
postcode.value.trim().toUpperCase();

return true;
}

function saveQuoteLocally() {
try {
const safeData = {
...quoteData,
photos: [],
created: new Date().toISOString()
};

localStorage.setItem(
"wba_latest_quote",
JSON.stringify(safeData)
);
} catch (error) {
console.warn("Could not save quote locally.", error);
}
}

function renderSubmittedQuote() {
const reference =
document.getElementById("quote-reference");

if (reference) {
reference.textContent =
quoteData.quoteReference;
}
}

function setupFinalOffer() {
const accept =
document.querySelector(".btn-final-accept");

const decline =
document.querySelector(".btn-final-decline");

const result =
document.getElementById("final-offer-result");

if (accept) {
accept.addEventListener("click", function () {
if (!result) {
return;
}

result.hidden = false;

result.innerHTML = `
<hr>
<h3>Final Offer Accepted</h3>
<p>
The final offer has been accepted.
</p>
<h3>Payment Details</h3>
<p>
Bank details are requested only after
the final offer has been accepted.
</p>
<label for="bank-name">Account Name</label>
<input type="text" id="bank-name">
<label for="account-number">Account Number</label>
<input
type="text"
id="account-number"
inputmode="numeric"
maxlength="8"
>
<label for="sort-code">Sort Code</label>
<input
type="text"
id="sort-code"
inputmode="numeric"
maxlength="8"
placeholder="12-34-56"
>
<button
type="button"
id="submit-bank-details"
class="btn-next"
>
Submit Bank Details
</button>
<p>
<strong>BACKEND PAYMENT INTEGRATION REQUIRED</strong>
</p>
`;

accept.hidden = true;

if (decline) {
decline.hidden = true;
}

const bankButton =
document.getElementById("submit-bank-details");

if (bankButton) {
bankButton.addEventListener("click", function () {
const bankName =
document.getElementById("bank-name");

const account =
document.getElementById("account-number");

const sort =
document.getElementById("sort-code");

if (
!bankName.value.trim() ||
!/^\d{8}$/.test(account.value.trim()) ||
!/^\d{2}-?\d{2}-?\d{2}$/.test(sort.value.trim())
) {
alert(
"Please enter a valid account name, 8-digit account number and 6-digit sort code."
);
return;
}

quoteData.bankName =
bankName.value.trim();

quoteData.accountNumber =
account.value.trim();

quoteData.sortCode =
sort.value.trim();

alert(
"Bank details captured for this prototype. A secure backend payment system is required before real banking information should be submitted."
);
});
}
});
}

if (decline) {
decline.addEventListener("click", function () {
if (!result) {
return;
}

result.hidden = false;

result.innerHTML = `
<hr>
<h3>Final Offer Declined</h3>
<p>
The equipment will be returned
to the full return address supplied
during your quote submission.
</p>
<p>
<strong>
BACKEND SHIPPING / RETURNS INTEGRATION REQUIRED
</strong>
</p>
`;

accept.hidden = true;
decline.hidden = true;
});
}
}

function handleNext() {
refreshSteps();

const stepNumber =
Number(steps[currentStep].dataset.step);

if (stepNumber === 1) {
if (!validateManufacturer()) {
return;
}

if (
quoteData.manufacturer.toLowerCase() === "dji"
) {
populateModels();
showStep(2);
return;
}

alert("This manufacturer is not currently supported.");
return;
}

if (stepNumber === 2) {
if (!validateModel()) {
return;
}

populatePackages();
showStep(3);
return;
}

if (stepNumber === 3) {
if (!validatePackage()) {
return;
}

showStep(4);
return;
}

if (stepNumber === 4) {
if (!validateCondition()) {
return;
}

showStep(5);
return;
}

if (stepNumber === 5) {
if (!validateFlight()) {
return;
}

ensureBatterySection();
showStep(6);
return;
}

if (stepNumber === 6) {
if (!validateBatteries()) {
return;
}

showStep(7);
return;
}

if (stepNumber === 7) {
if (!validateUnbound()) {
return;
}

showStep(8);
return;
}

if (stepNumber === 8) {
if (!validateDamage()) {
return;
}

showStep(9);
return;
}

if (stepNumber === 9) {
if (!validatePackageContents()) {
return;
}

showStep(10);
return;
}

if (stepNumber === 10) {
if (!validateSerialNumbers()) {
return;
}

showStep(11);
return;
}

if (stepNumber === 11) {
if (!validatePhotos()) {
return;
}

showStep(12);
return;
}

if (stepNumber === 13) {
if (!validateCustomerDetails()) {
return;
}

quoteData.quoteReference =
generateQuoteReference();

saveQuoteLocally();

renderSubmittedQuote();

showStep(14);
return;
}

if (stepNumber === 14) {
showStep(15);
return;
}

if (stepNumber === 15) {
showStep(16);
return;
}
}

form.addEventListener("click", function (event) {
const button =
event.target.closest("button");

if (!button || !form.contains(button)) {
return;
}

event.preventDefault();

if (button.id === "add-battery-btn") {
createBatteryEntry();
return;
}

if (button.classList.contains("btn-remove-battery")) {
const entry =
button.closest(".battery-entry");

if (entry) {
entry.remove();
}

return;
}

if (button.id === "add-accessory-btn") {
addAccessory();
return;
}

if (button.classList.contains("btn-remove-accessory")) {
const index =
Number(button.dataset.index);

quoteData.additionalAccessories.splice(index, 1);

renderAccessories();

return;
}

if (
button.classList.contains("btn-next") ||
button.classList.contains("btn-submit")
) {
handleNext();
return;
}

if (button.classList.contains("btn-back")) {
refreshSteps();

if (currentStep > 0) {
const previousNumber =
Number(steps[currentStep - 1].dataset.step);

showStep(previousNumber);
}

return;
}

if (
    button.id === "quote-result-action" ||
    button.classList.contains("btn-accept")
) {
    const result =
        calculateInstantQuote();

    quoteData.quoteAmount =
        result.amount;

    if (result.status === "automatic") {
        showStep(13);
    } else {
        showStep(13);
    }

    return;
}
});

form.addEventListener("change", function (event) {
const target = event.target;

if (target.id === "dji-model") {
quoteData.model = target.value;
quoteData.package = "";
batteryCount = 0;

const batteries =
document.getElementById("batteries-container");

if (batteries) {
batteries.innerHTML = "";
}

populatePackages();
}

if (target.id === "package-select") {
quoteData.package = target.value;
batteryCount = 0;

const batteries =
document.getElementById("batteries-container");

if (batteries) {
batteries.innerHTML = "";
}

const packageContents =
document.getElementById("package-contents-list");

if (packageContents) {
packageContents.innerHTML = "";
}
}

if (target.name === "damage") {
const details =
document.getElementById("damage-details");

if (details) {
details.hidden =
!(target.checked && target.value === "yes");
}
}
});

ensureLaterSteps();
refreshSteps();
populateModels();
populatePackages();
ensureBatterySection();
setupFinalOffer();
showStep(1);

console.log(
"WE BUY ANY DRONE quote wizard loaded successfully."
);

console.log(
"Wizard steps found:",
steps.length
);

});
