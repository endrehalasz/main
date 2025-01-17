
// Globális változók definiálása
    // firebase futtatásához
const firebaseConfig = {
    apiKey: "AIzaSyBqsRBiFQEw_QbI8e8cbkeM63EJkosuaq4",
    authDomain: "szeretetbenapp.firebaseapp.com",
    projectId: "szeretetbenapp",
    storageBucket: "szeretetbenapp.firebasestorage.app",
    messagingSenderId: "461393102877",
    appId: "1:461393102877:web:bf90328417e2433fff1ef4",
    measurementId: "G-PP2RL1FJVR"
};
const fb_app = firebase.initializeApp(firebaseConfig);
const auth = fb_app.auth();
// Globális változók definiálása
    // meghívott google script api url-ek
const apiUrls = {
    getUserData: "https://script.google.com/macros/s/AKfycbzGxj5sUlKZVZPIghphcTCjmY5Uz8nP3oszcJnXrUJyppxb46YEPhXLm14XtsofRGG7Kg/exec",
    saveUserData: "https://script.google.com/macros/s/AKfycbxReeHmqCLSdpqcjsHsfUIbtpeJwuyMG8syGfWXZJW_3zydaXtKUSw7gtiqWrfG2xOrBQ/exec",
    MedData: "https://script.google.com/macros/s/AKfycbzcBP4IoqeJI2PIM8mYINsWtuKjeGiNgZp8M907tR39uVNt5QAKXeUNj0KmTE-JI1BA4g/exec"
};
    // user aktuális adatai objektum – globális
    // később úgyis megkapja a kulcsokat!
let myUser = {
    USER_ID: 0
};
let admin = false;  // true, ha admin lépett be
let myMed = [];
let medTable_selectedRow_medId = null; // meditációk táblázat kiválasztott sorának MED_ID-je

const stateMapping = {
    "cimre_var": "Címre vár",
    "teasert_var": "Teaserre vár",
    "uzenet_var": "Üzenetre vár",
    "kikuldheto": "Kiküldhető",
    "nyitva": "Jelentkezés nyitva",
    "elmult": "Elmúlt",
    "torolt": "Törölve"
};


// **** RUN STARTS HERE ****
// USER_ID lekérése és adatlekérés indítása
const userId = getQueryParam('USER_ID');
const fb_uid = getQueryParam('fb_uid');
console.log(userId);
if (userId) {
    // user betöltése a felületre
    loadUser();
} else {
    console.error('USER_ID paraméter hiányzik a fejlécben.');
    window.location.href = `https://szeretetben.hu/bejelentkezes`;
}

/*
async function proba() {
    try {
        console.log(myUser.Email);
        const methods = await firebase.auth().fetchSignInMethodsForEmail(myUser.email);
        console.log("Regisztrált hitelesítési módok:", methods);

        if (methods.length === 0) {
            console.log("A felhasználó nem regisztrált.");
        } else {
            console.log("A felhasználónak az alábbi hitelesítési módjai vannak regisztrálva:");
            methods.forEach((method) => console.log(method));
        }
    } catch (error) {
        console.error("Hiba a hitelesítési módok lekérdezése során:", error);

        if (error.code === "auth/user-not-found") {
            console.error("A megadott e-mail cím nincs regisztrálva.");
        } else {
            console.error("Váratlan hiba történt:", error.message);
        }
    }
} */

async function proba() {
    alert(myUser.szamlacim);
}


// Bármely beadott objektumot url paraméterré alakít
    // bemenet: bármely objektumot
    // kimenet: egy url paraméter string, amit lehet a kérdőjel után tenni GET híváshoz, vagy a body:-ba lehet tenni POST híváshoz
function prepareParamsForURL(myObject) {
    const result = {};  // kezedetben üres objektum
    for (const key in myObject) {
        if (Array.isArray(myObject[key])) {
            // Tömb kezelése: külön paraméter minden elemnek
            result[key] = JSON.stringify(myObject[key]); 
        } else if (typeof myObject[key] === "object") {
            // Objektumokat JSON-é alakít
            result[key] = JSON.stringify(myObject[key]); 
        } else {
            result[key] = myObject[key]; // Szöveges értékek
        }
    }
    console.log(result);
    // visszatérési érték már a kész query paraméter!
    const myNewParam = new URLSearchParams(result);
    return myNewParam.toString();
}





// URL fejlécből kiszedi a kért paramétert és visszatér az értékével
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// API hívását intézi ez a függvény GET móddal
async function apiCallGet(my_api, my_headerString) {
    const mostani_apiurl = my_api + "?" + my_headerString;
    console.log("GET apiCall API hívás indítása", mostani_apiurl);
    try {
        const response = await fetch(mostani_apiurl);
        const data = await response.json();
        console.log("apiCall API válasz:", response.ok, data);
        return {ok: response.ok, data: data};  //kiadjuk az adatot (ami egy objektum, benne egy Boolean és egy Objektum)
    } catch (error) {
        alert("GET apiCall hiba – sajnos");
        console.error("Hiba az apiCall API hívás során:", error);
        return null;
    }
}

// API hívását intézi ez a függvény POST móddal
    // my_api=api url-je; my_param=url-parameter-string
async function apiCallPost(my_api, my_param) {
    const mostani_apiurl = my_api;
    console.log("POST apiCall API hívás indítása", mostani_apiurl);
    try {
        // a google api csak a application/x-www-form-urlencoded formátumot támogatja POST hívásban
        const response = await fetch(mostani_apiurl, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: my_param
        });
        
        const data = await response.json();
        console.log("apiCall API válasz:", response.ok, data);
        return {ok: response.ok, data: data};  //kiadjuk az adatot (ami egy objektum, benne egy Boolean és egy Objektum)
    } catch (error) {
        alert("POST apiCall hiba – sajnos");
        console.error("Hiba az apiCall API hívás során:", error);
        return null;
    }
}

// megkapott userId alapján lekéri a user adatait a google sheet-ből
// majd beleteszi a globális myUser objektumba
// nincs visszatérési érték
async function fetchUserDataArray() {
    const headerString = "USER_ID=" + userId;
    try {
        const apiResponse = await apiCallGet(apiUrls.getUserData, headerString);
        // console.log("API response.ok: ", apiResponse.ok);
        // console.log("API adatválasz: ", apiResponse.data);
        if(!apiResponse.ok) { throw new error("nemoké") }
        // betesszük a lekért user datokat a globális myUser objektumba
        Object.assign(myUser, apiResponse.data);
        // console.log(myUser);
    } catch {
        console.error("fetchUserDataArray – API válasz nem jött át megfelelően");
    }    
}

// User autentikációja és betöltése a felületre
async function loadUser() {
    // Oldalsáv és tartalom megjelenítése
    document.querySelector('.sidebar').classList.add('visible');
    document.querySelector('.content').classList.add('visible');
    // Mobil nézet kijelentkezés gomb megjelenítése
    document.querySelector('.mobile-logout').classList.add('visible');
    //await showSideBarButtons(false);
    await showSection("betoltes");
    // user adatainak betöltése a google sheet-ről
    await fetchUserDataArray();
    // Autentikáció és személyes fejléc betöltése
    if (myUser.Firebase_UID == fb_uid && myUser.login_type != "") {
        // Be szabad lépni
        console.log("Firebase uid összevetés egyezik");
        // Név megjelenítése a fejlécben
        document.getElementById('user-status').textContent = `${myUser.teljes_nev}`;
        // Profilkép megjelenítése a fejlécben, ha van
        if (myUser.profilfoto_url) {
            const profilePicture = document.getElementById('profile-picture');
            const profileImg = document.getElementById('profile-img');
            profileImg.src = myUser.profilfoto_url;
            profilePicture.style.display = 'block';
        }
        admin = false;
        // Admin belépés csekkolása
        if (myUser.USER_ID < 20000) {
            // Admin lépett be!
            admin = true;
            document.getElementById('user-status').textContent = `Admin: ${myUser.teljes_nev}`;
            // Admin gombok láthatóvá tétele
            document.getElementById('admin-users-btn').classList.remove('hidden');
            document.getElementById('admin-meditation-btn').classList.remove('hidden');
            document.getElementById('admin-proba-btn').classList.remove('hidden');
        }
        // Profil szekció adatfeltöltés
        await showSection("profilom");
        // Ha egy app status-hoz kell ugranunk ott folytatjuk
        switch (myUser.app_status) {
            case "":
                // normál app indulás
                break;
            case "profiltörlés":
                // profil törléséhez ugrunk
                await finalDeleteProfile();
                break;
        }
    } else {
        // Nem szabad belépni, kijelentkezik és kidob
        console.log("Sikertelen autentikáció");
        alert("Kérlek jelentkezz be újra!");
        await logoutUser();
        window.location.href = `https://szeretetben.hu/bejelentkezes`;
    }
}

// Átvált a kattintott szekcióra
async function showSection(sectionId) {
    // összes section elrejtése
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('visible');
    });
    // kiválasztott section mutatása
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('visible');
    }
    // ha a betöltés-t mutatjuk, akkor kapcsolja le a gombokat
        // egyébként pedig engedje
    if (sectionId === "betoltes") {
        disableSideBarButtons(true);
    } else {
        disableSideBarButtons(false);
    }
    // Profil gomb
    if (sectionId === 'profilom') {
        await updateProfileSection();
        showSideBarButtons(true);
    }
    // Profil szerkesztése gomb
    if (sectionId === 'profile-edit-section') {
        await updateProfileEditSection();
        showSideBarButtons(true);
    }
    // Meditációk gomb
    if (sectionId === 'meditaciok-section') {
        showSideBarButtons(true);
    }
    // Szervezés gomb
    if (sectionId === 'med-event-section') {
        showSideBarButtons(true);
    }
    // Próba gomb
    if (sectionId === 'proba-section') {
        await proba();
        showSideBarButtons(true);
    }
    // Új meditáció létrehozása
    if (sectionId === 'ujmed-section') {
        await loadUjMedSection();
        showSideBarButtons(true);
    }
}

// Sidebar gombok mutatása / elrejtése
function showSideBarButtons(visibility) {
    if (visibility) {
        // megmutatjuk a gombokat
        document.querySelectorAll('.sidebar .normalbutton').forEach(button => {
            button.classList.remove('hidden');
        });
        // ha admin, akkor admin gombok mutatása is
        if (admin) {
            document.querySelectorAll('.sidebar .adminbutton').forEach(adminButton => {
            adminButton.classList.remove('hidden');
            });
        }
    } else {
        // elrejtjük az összes gombot
        document.querySelectorAll('.sidebar button').forEach(button => {
            button.classList.add('hidden');
        });
    }
}

function disableSideBarButtons(disabled) {
    if (!disabled) {
        // disabled = false –» aktívvá tesszük a gombokat
        document.querySelectorAll('.sidebar .normalbutton').forEach(button => {
            button.disabled = false;
            button.classList.remove('disabled');
        });
        document.querySelectorAll('.sidebar .adminButton').forEach(button => {
            button.disabled = false;
            button.classList.remove('disabled');
        });
    } else {
        // disabled = true –» elrejtjük az összes gombot
        document.querySelectorAll('.sidebar .normalbutton').forEach(button => {
            button.disabled = true;
            button.classList.add('disabled');
        });
        document.querySelectorAll('.sidebar .adminButton').forEach(button => {
            button.disabled = true;
            button.classList.add('disabled');
        });
    }
}

// User Kijelentkezés, majd kidob a login oldalra
async function logoutUser() {
    try {
        console.log("A User kijelentkezik");
        await firebase.auth().signOut();
        window.location.href = "https://www.szeretetben.hu/bejelentkezes";
        console.log("Oké! Ki is vagy jelentkezve!");
    } catch (error) {
        console.error('Hiba a kijelentkezés során:', error);
    }
}

// Frissíti a profil szekció tartalmát
async function updateProfileSection() {
    document.getElementById("profilom").innerHTML = `
        <h3>Profilom</h3>
        <p><b>Teljes név: </b>${myUser.teljes_nev}</p>
        <p><b>Vezetéknév: </b>${myUser.vezeteknev}</p>
        <p><b>Keresztnév: </b>${myUser.keresztnev}</p>
        <p><b>Telefonszám: </b>${myUser.telefon}</p>
        <p><b>Email: </b>${myUser.email}</p>
        <p><b>Értesítés meditációkról: </b>${myUser.med_ertesit ? "Igen" : "Nem"}</p>
        <p><b>Értesítés workshopokról: </b>${myUser.ws_ertesit ? "Igen" : "Nem"}</p>
        <p><b>Számlacím: </b>${myUser.szamlacim}</p>
        <button class="button-edit" onclick="showSection('profile-edit-section')">Szerkesztés</button>
    `;
}

// profil szerkesztése szekció tartalma
async function updateProfileEditSection() {
    document.getElementById("profile-edit-section").innerHTML = `
        <h3>Profil módosítása</h3>
        <p><Belépés módja: <${myUser.login_type}</p>
        <p><label>Teljes név: <input type="text" id="edit-fullname" value="${myUser.teljes_nev}" class="inputbox"></label></p>
        <p><label>Vezetéknév: <input type="text" id="edit-lastname" value="${myUser.vezeteknev}" class="inputbox"></label></p>
        <p><label>Keresztnév: <input type="text" id="edit-firstname" value="${myUser.keresztnev}" class="inputbox"></label></p>
        <p><label>Email: <input type="text" id="edit-email" value="${myUser.email}" class="inputbox"></label></p>
        <p><label>Új jelszó: <input type="text" id="edit-newpassword" value="" class="inputbox"></label></p>
        <p><label>Telefonszám: <input type="text" id="edit-telefon" value="${myUser.telefon}" class="inputbox"></label></p>
        <p><label>Értesítés meditációkról:
            <input type="radio" name="med-notify" value="true" ${myUser.med_ertesit ? "checked" : ""}> Igen
            <input type="radio" name="med-notify" value="false" ${!myUser.med_ertesit ? "checked" : ""}> Nem
        </label></p>
        <p><label>Értesítés workshopokról:
            <input type="radio" name="work-notify" value="true" ${myUser.ws_ertesit ? "checked" : ""}> Igen
            <input type="radio" name="work-notify" value="false" ${!myUser.ws_ertesit ? "checked" : ""}> Nem
        </label></p>
        <p><label>Számlázási cím: <input type="text" id="edit-szamlacim" value="${myUser.szamlacim}" class="inputbox"></label></p>
        <div>
            <button class="button-uj-med" onclick="showSection('profilom')">Mégsem</button>
            <button class="button-uj-med" onclick="editUserData()">Mentés</button>
            <button class="button-uj-med" onclick="deleteProfileButton()">Profil törlése</button>
        </div>
    `;
    
    // attól függ, hogy mit változtathat, hogy hogyan lépett be
    if (myUser.login_type == "password") {
        let disabledLabel = document.getElementById("edit-fullname");
        disabledLabel.removeAttribute("readonly");
        disabledLabel.style.backgroundColor = "white";
        disabledLabel = document.getElementById("edit-email");
        disabledLabel.removeAttribute("readonly");
        disabledLabel.style.backgroundColor = "white";
        disabledLabel = document.getElementById("edit-newpassword");
        disabledLabel.removeAttribute("readonly");
        disabledLabel.style.backgroundColor = "white";

    } else {
        let disabledLabel = document.getElementById("edit-fullname");
        disabledLabel.setAttribute("readonly", true);
        disabledLabel.style.backgroundColor = "gray";
        disabledLabel = document.getElementById("edit-email");
        disabledLabel.setAttribute("readonly", true);
        disabledLabel.style.backgroundColor = "gray";
        disabledLabel = document.getElementById("edit-newpassword");
        disabledLabel.setAttribute("readonly", true);
        disabledLabel.style.backgroundColor = "gray";
    }
}

// menti az új USER adatokat a myUser array-be, és ellenőrzi a beviteli mezők értékeit, hogy rendben vannak-e
async function editUserData() {
    const mezo_teljesnev = document.getElementById("edit-fullname").value.trim();
    const mezo_vezeteknev = document.getElementById("edit-lastname").value.trim();
    const mezo_keresztnev = document.getElementById("edit-firstname").value.trim();
    const mezo_szamlacim = document.getElementById("edit-szamlacim").value.trim();
    const mezo_telefon = document.getElementById("edit-telefon").value.trim();
    
    if (!mezo_teljesnev || !mezo_vezeteknev || !mezo_keresztnev || !mezo_telefon) {
        alert("Minden mezőt ki kell tölteni!");
        return;
    }
    
    myUser.teljesnev = mezo_teljesnev;
    myUser.vezeteknev = mezo_vezeteknev;
    myUser.keresztnev = mezo_keresztnev;
    myUser.szamlacim = mezo_szamlacim;
    myUser.telefon = mezo_telefon;
    myUser.med_ertesit = document.querySelector('input[name="med-notify"]:checked').value;
    myUser.ws_ertesit = document.querySelector('input[name="work-notify"]:checked').value;
    await showSection("betoltes");
    await saveUserData();
    await showSection("profilom"); // Visszatérés a profil szekcióhoz
}

// menti a user adatokat a myUser array-ből a google sheet-be
async function saveUserData() {
    // Adatok saveUserData API-n keresztüli mentése
    console.log("Új user adatok mentése...")
    try {
        const apiResponse = await apiCallPost(apiUrls.saveUserData, prepareParamsForURL({USER_ID: myUser.USER_ID, data: myUser}));
        console.log("saveUserData – API response: ", apiResponse.ok, apiResponse.data);
        if(!apiResponse.ok) { throw new error("nemoké") }
        // ide csak akkor jutunk, ha rendesen lefutott
        console.log("saveUserData – Mentés lefutott!");
    } catch {
        alert("Sajnálom, Valamilyen hiba történt az adatok mentése közben.");
        console.error("saveUserData – API válasz nem jött át megfelelően", response.error);
    }
}

// Ez kezeli a profil törlését
async function deleteProfileButton() {
    if (confirm("Ha törlöd a profilodat, minden adatod el fog veszni, a jelentkezéseidet lemondjuk, kilépsz a Szeretetben App-ról és a regisztrációdat mindenestül töröljük. Biztosan szeretnéd, hogy töröljük a profilodat?")) {
        console.log("Felhasználó törli a profilját");
        // Ide jöhet a törlés API hívása
        showSection("profilom");
        // Firebase minden authentikációs mód törlése
        alert("A profilod törléséhez újra be kell jelentkezned!");
        // Törlési kérelem google sheet-be mentése
        myUser.app_status = "";
        
        // kilép, újra be kell lépnie
        await logoutUser();
        window.location.href = `https://szeretetben.hu/bejelentkezes`;

    } else {
        console.log("Felhasználó mégsem törli a profilját");
    }
}

// Profil végleges törlése
function finalDeleteProfile() {
    // Firebase minden authentikációs mód törlése
    if (confirm("Biztosan szeretnéd, hogy véglegesen töröljük a regisztrációdat?")) {
        console.log("Felhasználó tényleg végleg törli a profilját");
        // Ide jöhet a törlés API hívása
        showSection("profilom");
        // Firebase minden authentikációs mód törlése
            // Most már újra belépés után
        auth.currentUser.delete();
        //window.location.href = `https://szeretetben.hu/bejelentkezes`;
    } else {
        console.log("Felhasználó mégsem törli a profilját");
    }
    
}

// lekéri a meditációs listát a google sheet-ből
// majd beleteszi a globális myMed array-be
// a jelentkezők névsora is benne van
async function fetchMedDataArray() {
    const headerString = "parancs=readMedList";
    try {
        const apiResponse = await apiCallGet(apiUrls.MedData, headerString);
        console.log("API response.ok: ", apiResponse.ok);
        console.log("API adatválasz: ", apiResponse.data);
        console.log(apiResponse.ok);
        if(!apiResponse.ok) { throw new error("nemoké") }
        // betesszük a lekért user datokat a globális myMed array-be
        // csak előbb vissza kell alakítani a JSON string-et
        const parsedData = JSON.parse(apiResponse.data.data); // JSON string visszaalakítása
        if (!Array.isArray(parsedData)) {
            throw new Error("A JSON string nem egy tömböt tartalmaz");
        }
        // Globális myMed tömb feltöltése az adatokkal
        myMed.length = 0; // Esetlegesen meglévő elemek törlése
        myMed.push(...parsedData);
        console.log("Meditációs lista áthozva: ", myMed);
    } catch {
        console.error("fetchMedDataArray – API válasz nem jött át megfelelően");
    }    
}

// Frissíti-betölti az szervezett események listáját
async function updateEventSection() {
    document.getElementById("med-event-section").innerHTML = `
        <h3>Meditációk szervezése</h3>
        <table id="medTable" class="responsive-table">
        <thead>
            <tr>
                <th>Dátum</th>
                <th>Idő</th>
                <th>Cím</th>
                <th>Max</th>
                <th>Jelen</th>
                <th>Váró</th>
                <th>Állapot</th>
            </tr>
        </thead>
        <tbody>
            ${myMed.map(item => `
                <tr data-id="${item.MED_ID}">
                    <td>${item.datum}</td>
                    <td>${item.ido}</td>
                    <td>${item.cim}</td>
                    <td>${item.max_ember}</td>
                    <td>${item.jelentkezett}</td>
                    <td>${item.varolistan}</td>
                    <td>${stateMapping[item.state] || "?"}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <button class="button-edit" onclick="showSection('ujmed-section')">Új Med</button>
    <select id="allapot-lista" class="row-selected" style="display: none; width: 200px; font-size: 18px; padding: 5px; margin-top: 5px;" onchange="handleMedAllapot(this)">
        <option value="" selected disabled>Állapot</option>
        <option value="cimre_var">Címre vár</option>
        <option value="teasert_var">Teaserre vár</option>
        <option value="uzenet_var">Üzenetre vár</option>
        <option value="kikuldheto">Kiküldhető</option>
        <option value="nyitva">Jelentkezés nyitva</option>
        <option value="elmult">Elmúlt</option>
        <option value="torolt">Törlés</option>
    </select>
    
    
    <div id="medInfo" style="display: none; margin-top: 10px;">
        <label id="mouseOverMedIdLabel">MED_ID: </label>
        <label id="mouseOverLabel"></label>
        <div id="medInfo" style="display: none; margin-top: 10px;">
            <table id="jelentkezokTable" class="responsive-table">
                <thead>
                    <tr>
                        <th>Név</th>
                        <th>Visszajelzés</th>
                    </tr>
                </thead>
                <tbody id="jelentkezokBody">
                </tbody>
            </table>
        </div>

    </div>
    `;
    
    // Táblázat sorok interaktív kijelölése
    const table = document.getElementById("medTable");
    table.addEventListener("click", event => {
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const targetRow = event.target.closest("tr");
        const rowSelectedButtons = document.querySelectorAll(".row-selected");
        const label = document.getElementById("mouseOverLabel"); // A cél label
        // Az azonosító kiolvasása a kiválasztott sorból
        const selected_medId = targetRow.getAttribute("data-id");
        if (targetRow && selected_medId) {
            if (targetRow.classList.contains("selected")) {
                // Ha már ki van jelölve, akkor töröld a kijelölést
                targetRow.classList.remove("selected");
                medTable_selectedRow_medId = null;
                rowSelectedButtons.forEach(button => button.style.display = "none");
                label.innerHTML = ""; // Töröljük a label tartalmát
            } else {
                rows.forEach(row => row.classList.remove("selected"));
                targetRow.classList.add("selected");
                medTable_selectedRow_medId = selected_medId;
                rowSelectedButtons.forEach(button => button.style.display = "inline-block");
                // Kiválasztott meditáció adatai
                const selectedMeditacio = myMed.find(item => item.MED_ID == String(selected_medId));
                if (selectedMeditacio) {
                    const jelentkezok = selectedMeditacio.jelentkezok || [];
                    const jelentkezett = jelentkezok.filter(j => j.jelentkezes_state === "jelentkezett");
                    const varolistan = jelentkezok.filter(j => j.jelentkezes_state === "varolistan");
                    const lemondta = jelentkezok.filter(j => j.jelentkezes_state === "lemondta");
                    
                    console.log(selectedMeditacio);
                    console.log(jelentkezok);
                    console.log(jelentkezett);
                    console.log(varolistan);
                    console.log(lemondta);
                    // Jelentkezett listázása
                    const tableBody = document.getElementById("jelentkezokBody");
                    const medInfoDiv = document.getElementById("medInfo");
                    
                    // Töröljük a meglévő tartalmat
                    tableBody.innerHTML = "";
                    
                    // Ha nincs kijelölt sor, elrejtjük a táblázatot
                    if (!targetRow || !selected_medId) {
                        medInfoDiv.style.display = "none";
                        return;
                    }
                    
                    // Ha van kijelölt meditáció
                    medInfoDiv.style.display = "block";
                    
                    // Jelentkezett szakasz
                    if (jelentkezett.length > 0) {
                        const headerRow = document.createElement("tr");
                        headerRow.innerHTML = `<td colspan="2" style="font-weight: bold;">Jelentkezett</td>`;
                        tableBody.appendChild(headerRow);
                    
                        jelentkezett.forEach(j => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${j.vezeteknev} ${j.keresztnev}</td>
                                <td>${j.response_state || "Nincs válasz"}</td>
                            `;
                            tableBody.appendChild(row);
                        });
                    } else {
                        const emptyRow = document.createElement("tr");
                        emptyRow.innerHTML = `<td colspan="2">Üres</td>`;
                        tableBody.appendChild(emptyRow);
                    }
                    
                    // Várólistás szakasz
                    if (varolistan.length > 0) {
                        const headerRow = document.createElement("tr");
                        headerRow.innerHTML = `<td colspan="2" style="font-weight: bold;">Várólistán</td>`;
                        tableBody.appendChild(headerRow);
                    
                        varolistan.forEach(j => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${j.vezeteknev} ${j.keresztnev}</td>
                                <td>${j.response_state || "Nincs válasz"}</td>
                            `;
                            tableBody.appendChild(row);
                        });
                    } else {
                        const emptyRow = document.createElement("tr");
                        emptyRow.innerHTML = `<td colspan="2">Üres</td>`;
                        tableBody.appendChild(emptyRow);
                    }
                    
                    // Lemondta szakasz
                    if (lemondta.length > 0) {
                        const headerRow = document.createElement("tr");
                        headerRow.innerHTML = `<td colspan="2" style="font-weight: bold;">Lemondta</td>`;
                        tableBody.appendChild(headerRow);
                    
                        lemondta.forEach(j => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${j.vezeteknev} ${j.keresztnev}</td>
                                <td>${j.response_state || "Nincs válasz"}</td>
                            `;
                            tableBody.appendChild(row);
                        });
                    } else {
                        const emptyRow = document.createElement("tr");
                        emptyRow.innerHTML = `<td colspan="2">Senki</td>`;
                        tableBody.appendChild(emptyRow);
                    }

                    /* let labelContent = "<strong>Jelentkezett:</strong><br>";
                    labelContent += jelentkezett.length > 0 
                        ? jelentkezett.map(j => `${j.vezeteknev} ${j.keresztnev} (${j.response_state || "Nincs válasz"})`).join("<br>") 
                        : "Üres";
                    // Várólistás listázása
                    labelContent += "<br><br><strong>Várólistán:</strong><br>";
                    labelContent += varolistan.length > 0 
                        ? varolistan.map(j => `${j.vezeteknev} ${j.keresztnev} (${j.response_state || "Nincs válasz"})`).join("<br>") 
                        : "Üres";
                    // Lemondta listázása
                    labelContent += "<br><br><strong>Lemondta:</strong><br>";
                    labelContent += lemondta.length > 0 
                        ? lemondta.map(j => `${j.vezeteknev} ${j.keresztnev} (${j.response_state || "Nincs válasz"})`).join("<br>") 
                        : "Senki";
                    // Label frissítése
                    label.innerHTML = labelContent;*/
                }
            }
        }
    });
    
    table.addEventListener("mouseover", event => {
        const label = document.getElementById("mouseOverMedIdLabel");
        const targetRow = event.target.closest("tr");
        if (targetRow) {
            const medInfoDiv = document.getElementById("medInfo");
            const mouseover_medId = targetRow.getAttribute("data-id");
            // Az azonosító kiolvasása a mouseover sorból
            label.textContent = `MED_ID: ${mouseover_medId}`;
            medInfoDiv.style.display = "block";
            // console.log(mouseover_medId);
        }
    });
    table.addEventListener("mouseout", event => {
        const targetRow = event.target.closest("tr");
        const medInfoDiv = document.getElementById("medInfo");
    
        if (!targetRow) {
            medInfoDiv.style.display = "none"; // Label elrejtése
        }
    });
    await showSection('med-event-section');
}

async function handleMedAllapot() {
    const allapotLista = document.getElementById("allapot-lista");
    const selectedValue = allapotLista.value;
    if (!selectedValue) {
        return;
    }
    switch (selectedValue) {
    case "cimre_var":
        break;
    case "teasert_var":
        break;
    case "uzenet_var":
        break;
    case "kikuldheto":
        break;
    case "nyitva":
        break;
    case "elmult":
        break;
    case "torolt":
        await deleteMed();
        break;
    }
    document.getElementById("allapot-lista").selectedIndex = 0;
}

async function readMedList() {
    await showSection("betoltes");
    await fetchMedDataArray();
    await updateEventSection();
}

// betölti az új meditáció létrehozása section-t
async function loadUjMedSection() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD formátum

    document.getElementById("ujmed-section").innerHTML = `
        <p><label for="meditacio-datuma">Meditáció dátuma:</label>
        <input type="date" id="meditacio-datuma" name="meditacio-datuma" required value="${todayString}"></p>
        
        <p><label for="meditacio-ideje">Meditáció ideje:</label>
        <input type="time" id="meditacio-ideje" name="meditacio-ideje" required value="18:00"></p>
        
        <p><label for="max-letszam">Maximális létszám:</label>
        <input type="number" id="max-letszam" name="max-letszam" min="1" max="100" required value="14"></p>
        
        <div style="margin-top: 10px;">
        <button class="button-edit" id="vissza-button" onclick="showSection('med-event-section')">Vissza</button>
        <button class="button-edit" id="letrehozas-button" onclick="createNewMed()">Létrehozás</button>
        </div>
    `;
}
// ellenőrzi az adatokat és létrehozza az új meditácit
    // api hívása
async function createNewMed() {
    // A felhasználó által megadott értékek beolvasása
    const datum = document.getElementById("meditacio-datuma").value;
    const ido = document.getElementById("meditacio-ideje").value;
    const maxLetszam = document.getElementById("max-letszam").value;
    const ujMeditacio = {
        datum: datum,                     // Dátum (YYYY-MM-DD)
        ido: ido,                         // Idő (HH:MM)
        max_ember: parseInt(maxLetszam),  // számként
        letrehozta: `${myUser.vezeteknev} ${myUser.keresztnev}` 
    };
    // menti az API-n keresztül az új meditációt a google sheet-be
    console.log("Új meditáció mentése...")
    try {
        const apiResponse = await apiCallPost(apiUrls.MedData, prepareParamsForURL({parancs: "uj_meditacio", data: ujMeditacio}));
        console.log("createNewMed – API response: ", apiResponse.ok, apiResponse.data);
        if(!apiResponse.ok) { throw new error("nemoké") }
        // ide csak akkor jutunk, ha rendesen lefutott
        console.log("createNewMed – Mentés lefutott!");
        alert("Rendben! Az új meditációt létrehoztam!");
        await updateEventSection();
    } catch {
        alert("Sajnálom, Valamilyen hiba történt az adatok mentése közben.");
        console.error("createNewMed – API válasz nem jött át megfelelően", response.error);
    }
}

// Meditáció törlése
    // előtte ellenőrzést végez és visszakérdez
async function deleteMed() {
    if (medTable_selectedRow_medId) {
        //alert("meditáció törlése MED_ID "+ medTable_selectedRow_medId);
        let uzenetSzoveg = "Biztosan törlöd ezt a meditációt?"
        // Kiválasztott meditáció keresése az ID alapján
        const selectedMeditacio = myMed.find(item => item.MED_ID == String(medTable_selectedRow_medId));
        // Jelentkezők összeszámolása
        const osszesJelentkezo = (selectedMeditacio.jelentkezett || 0) + (selectedMeditacio.varolistan || 0);
        if (osszesJelentkezo > 0) uzenetSzoveg = "A kiválasztott meditációra már jelentkezett " + osszesJelentkezo + " fő. " + uzenetSzoveg;
        const confirmation = confirm(uzenetSzoveg);
        if (!confirmation) {
            //alert("A törlés megszakítva.");
            return; // Kilép a függvényből, ha a felhasználó a "Nem" gombra kattint.
        }
        await showSection("betoltes");
        const torolMeditacio = {
            MED_ID: medTable_selectedRow_medId,
            modositotta: `${myUser.vezeteknev} ${myUser.keresztnev}` 
        };
        // törli az API-n keresztül  meditációt a google sheet-ben
        console.log("Meditáció törlése...")
        try {
            const apiResponse = await apiCallPost(apiUrls.MedData, prepareParamsForURL({parancs: "meditacio_torlese", data: torolMeditacio}));
            console.log("deleteMed – API response: ", apiResponse.ok, apiResponse.data);
            if(!apiResponse.ok) { throw new Error("nemoké") }
            // ide csak akkor jutunk, ha rendesen lefutott
            console.log("deleteMed – Törlés lefutott!");
            alert("Rendben! Töröltem a meditációt!");
            const parsedData = JSON.parse(apiResponse.data.data); // JSON string visszaalakítása
            // A frissített meditációs listát itt kapjuk meg –» myMed-be rakjuk és frissítjük a táblázatot
            if (!Array.isArray(parsedData)) {
                throw new Error("deleteMed – A JSON string nem egy tömböt tartalmaz");
            }
            // Globális myMed tömb feltöltése az adatokkal
            myMed.length = 0; // Esetlegesen meglévő elemek törlése
            myMed.push(...parsedData);
            console.log("Meditációs lista áthozva: ", myMed);
            await updateEventSection();
        } catch (error) {
            alert("Sajnálom, Valamilyen hiba történt a meditáció törlése közben.");
            console.error("createNewMed – API válasz nem jött át megfelelően", error);
        }
        await updateEventSection();
    }
}
