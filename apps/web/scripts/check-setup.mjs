// Checks that Turso and Cloudinary are set up correctly, using the same code
// the app runs. Run from apps/web:
//
//   npm run check:setup        (reads .env)
//
// It prints no secrets. It creates the app's tables in Turso if needed and
// uploads + deletes one tiny 1-second test clip on Cloudinary.
import getDb, { usingTurso } from "../src/app/api/utils/db.js";
import { cloudinaryEnabled, destroyCloudinary, directUploadTicket, storageInfo, verifyUploadResult } from "../src/app/api/utils/storage.js";

const TINY_MP4 = "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAaebW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAuN0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAIAAABAAAAAAJbbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACBm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAcZzdGJsAAAAwnN0c2QAAAAAAAAAAQAAALJhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAOGF2Y0MBZAAK/+EAGmdkAAqscgREJsBEAAADAAQAAAMAUDxIlhGAAQAHaOhDg5LIsP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAacAAAGnAAAAAYc3R0cwAAAAAAAAABAAAACgAABAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAADhjdHRzAAAAAAAAAAUAAAABAAAIAAAAAAEAACgAAAAAAQAAEAAAAAADAAAAAAAAAAQAAAQAAAAAKHN0c2MAAAAAAAAAAgAAAAEAAAACAAAAAQAAAAIAAAABAAAAAQAAADxzdHN6AAAAAAAAAAAAAAAKAAAC2QAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAADRzdGNvAAAAAAAAAAkAAAbOAAAKRwAAC5oAAAyKAAANbgAADkcAAA74AAAPsAAAEMoAAALldHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAgAAAAAAAAPoAAAAAAAAAAAAAAABAQAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAJGVkdHMAAAAcZWxzdAAAAAAAAAABAAAD6AAABAAAAQAAAAACXW1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAViIAAFoiVcQAAAAAAC1oZGxyAAAAAAAAAABzb3VuAAAAAAAAAAAAAAAAU291bmRIYW5kbGVyAAAAAghtaW5mAAAAEHNtaGQAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAcxzdGJsAAAAfnN0c2QAAAAAAAAAAQAAAG5tcDRhAAAAAAAAAAEAAAAAAAAAAAABABAAAAAAViIAAAAAADZlc2RzAAAAAAOAgIAlAAIABICAgBdAFQAAAAAARRIAAEUSBYCAgAUTiFblAAaAgIABAgAAABRidHJ0AAAAAAAARRIAAEUSAAAAIHN0dHMAAAAAAAAAAgAAABYAAAQAAAAAAQAAAiIAAABMc3RzYwAAAAAAAAAFAAAAAQAAAAEAAAABAAAAAgAAAAMAAAABAAAAAwAAAAIAAAABAAAACAAAAAMAAAABAAAACQAAAAYAAAABAAAAcHN0c3oAAAAAAAAAAAAAABcAAACTAAAAgwAAAGcAAABcAAAAjAAAAFcAAACGAAAAUQAAAHwAAABQAAAAUAAAAFQAAABQAAAAWwAAAFgAAABaAAAAWwAAAGAAAABdAAAAfQAAAFUAAABkAAAAWwAAADRzdGNvAAAAAAAAAAkAAAm0AAAKVAAAC6cAAAyXAAANewAADlQAAA8FAAAPvQAAENcAAAAac2dwZAEAAAByb2xsAAAAAgAAAAH//wAAABxzYmdwAAAAAHJvbGwAAAABAAAAFwAAAAEAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjE2LjEwMAAAAAhmcmVlAAAMX21kYXQAAAKwBgX//6zcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTY0IHIzMTA4IDMxZTE5ZjkgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDIzIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MSByZWY9MTYgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDEzMyBtZT11bWggc3VibWU9MTAgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0yNCBjaHJvbWFfbWU9MSB0cmVsbGlzPTIgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0yIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9OCBiX3B5cmFtaWQ9MiBiX2FkYXB0PTIgYl9iaWFzPTAgZGlyZWN0PTMgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0xMCBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTYwIHJjPWNyZiBtYnRyZWU9MSBjcmY9NDAuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAACFliIEAAj/+JEfAo3F5hTwXKBrgdV0ckeo1Cqmmk1/MimcAAAAJQZoJLYhv/wLG3gIATGF2YzYwLjMxLjEwMgACWKJUUiL+13Wc+/67/Ep4+N5qVNUkLDFYnFYnFYnj3VTRlUxrVdrVlsWJs3GePw2+6VUasKUKVO2KsyVZkn1spVGVRlcZKBgb+jf0YGBgYGBgYGBgYGNmwYGRIgYGBgYGRIpZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZeAAAACUGeEIcQQ/84IQESktrKc2S5slzZLl//T/+/x1cvXv//W/9/rri71+f/6v/z9+uL1r+P/6v/2+OtanQdvaTDIMDAwMDOiVPX6mK9hOLYEZGMRqIqNcVH0io+kVH03cSoN9NfGIyzm41PyRvSmAm1EZkUbIo3oo3og9FEA8yKKMPMgNdCYqeeeeef5c3AAR7xGRBSqy32yeL+3z/j2udNS01Uu2krUB0tjjMju7u4gzVUlpt9eLNZJmshM/8fBk+/uQ+Phse/vCMnxmGf3IP/Bg77wh/4bDvvCPj4zDP76Af4zBPvoD+TMF++gP/BgnRoCPjhwADqMRD2UnmdVO8T5//s1/8/yVrWXzrJF7azJBeKkSJEjrNgc6BvhA/qyDs44OBnu/TpZpeixecxecuDNLERBLqUFilCjJ8+xz26UegGyXxGAzLZLzyFCoKQvu8/AAAACQGeGCaIb/9GQAE+MQAsaysJGsSAoJ//+36zjN//3t/+f/W++MjvWjLkkulAA433CiwuXi1wSD6ICnLNEjlkB8oNLQGWeVQYk+GFgw8e9IYeweDNvDih7ylwDAx7zpT2FcdmNnnEjhvXqXOcL6RIEYoeULHARzCpBUuNU8xbymXGd28UyKe1jtGJNdg2Q/tQHlojDnnAAPAxETIxs1k93e5/+H2/6/83bWdYzju5XPUrm7EQNGjVLLL/Q5/K/36PiYItWrVq1NXWsOquOvirNw/OlUq4U5VnnvKQuzNMM5mnmhXE12P3DXMBW2ngAAAACQGeGEaIb/9GQQE+MQAkWzMQlsSAsJ//436aP/7P2/9v+W+OYqSKs6qEA+OiiheqtqNc5c2rqxHQCz1qFeSg4I0rSUVIKBRIz0UUGooMZawuRM0EDRhQytcrKGvXoUAAx+SS+JHbZFbDWwVqWRgAmjAirkw2FPOkPqH0rzpUicnZyEGupQjCEqnpptOwQ7dPAPAxCsLEk+034+f/7X6f+//7uIb6rvzTnp31M9fAI0o+SPl8vkd+MwMPl8vlsq2cQhA2FlCIbptR/p3QUr6FAIlPjqUuruKriwrtr2VUJau3AAAACQGeGGaIb/9GQQE+MQAoayoYUKJiIJ//5nyrXP/8Xr/5/zvTcm+MgkuSqsOaS3ROuXNEYluUr6HJglKZBphQ2vnpU5qk5okJutNQ9GVrnZw7Us8dXWcqrLYZpMB/bgK1Ezw6C1Q1qMpMgEDkqqJJXe5JUFH+Shda0jVOVmqW8+4wjq3P6bwA7DEKotb6991z4+f/7Xz//D/1qVpdKuqj17Hj4wPV8xzzzznOqMNznnnUpU5ztDedUa6K6F89KU0FMV1qUE7XRKb1LRVcRlFfloo3ha3HgAAAAAkBnhitSG//RkEA6jEKotTdeN77+f/7fv/+P/6RV003JJXrzJ7+aGZ7dI8888lLDAPft555kj1znewcrmPTN1GvXjSzc4SeTL6QjDNnsrJFKs31DEQILkhKfADwMQtCheVzm/Hz//b+f/f/96rUlTjnWT59rnv8Bgsx1ev69TnhIF0+v69Y/1h64UBQaFHUoLmrjnOdd9Z2kKvZIXtCItfxU8pytcZQ2/ei1xtvfgAAAAkBnhjNSG//RkEA6jELYnO5zm+/X/9z9P/f/9bRdOOUifb4vPXxsOIekR3d3d3SGMDIiii7uUUUUk0SHg4UTEd50DuexIpGGRK95yCY3HpnegMQoRRlDUArwADqMQggF1Ek2j33vn2//pf9v//X/lXFSp1zUtVc8Sb1QoROKJiYmPP5nND+yQl0UUUUGoWag1DOeiCK0TcyvK07dreETiG1tII2QxWlK+7qod9WNG3JNKKVOt4AAAAJAZ4Y7Uhv/0ZAAOwxERZCYajc8Zk7/9Pz/9/8pmpUpLpW7ubuhCzKblxRaWOpi81bLF7bXFg2IoouJFlfV3KRsIIDBzHLLV5yQtsmekpD2YsnelFa1Lbu7vLpYdGFBAnrcADqMREOQjiwxjPGZXP/7fb/z/72uKVLqmvfjWVxsNpGrtMSJ+c63Yv9v/pXsJIXvpu+m6/6Btt5tvYWK5YOVtco6ys2e0Bj2R7HJzyKmuqmV+PhqwoXCDOnwADuMRkyMZqERL1X23rvx/+Hv/8/7KtMvrlEzJJNgQg101ZgZHXTXTbre3fs+/43iYd/u376c96m/fdB7rQnS1HmbY0VyQ3761DZcsVjFeClZVpej7Ymti4Be3AAAAAJAZ4ZDUhv/0ZAAOoxJaTjO3N85rvf/9rf/6fiLFt3dZx3qUuhMrq6Lq9Tfu37vOvF/yW79K1LWHnkvPJeY87pYhLJAHkIG114XMStAekT30PQ5I8EVmDobOtTVaMo/lw1lEs+Ey7U5uHgAPAxERZCeJ2sv3xuf/3O//x/clXJzxVXK71qt3BePUu2pDNea8c9wBSnbrOVQHxAYf9dXVPOFHUuhfUoKjZXUc74Pg0Na9Cl1QZxmFo29uyDRRRetH7g2LlKMU58AT4xACxrKiVVAUE//8dfxV1z/9Pt/9v1vXKtVeVJKu8msgAJLf66hhUlyaIO0WGX/fs4SCVnNgcG0YGZ/U9JizKOV8aIsixRY2FERJpZMFFUuLIaDpgR7O2euY13tSrS9oEWutbapbxS33nG57yyE2hNFxct3LtvfumH+68A9DERLjIpxe2T8q3z/9fz/n/8ySpcrKlslt6DEggSYTTdE+WPQfRbAS6KKKDUUHRW2o2vkR2iwi4uLSTrbimr7tjJFXStWMZZkrnrC3bYNpIY71nwAUQxE+NL675zK9/0/9rnV1fnmrTjfW7tLgAAAAUPDw8PD4lsDw8PD2z7wAAAAABhiMeHh4eHu7wAAAYd3Dw8PbdbiAAAAFO7xh4eHtu9gAAADDu48PDw93cQAAAAYd7Q8PDw/gE6MQvjeMq1699+uPv1U6ytdcy64zVS4gdz+/v7+/vM/mz6BoD/x8fHw22E+/vo9wH3/j4+DAJ9/f3BA/x8fDYAd9/f3AAf+PgxgE+/v7wgDJ8fDYAHv7+4AHA=";

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
let failures = 0;

console.log("\nDatabase");
if (!usingTurso) {
  bad("TURSO_DATABASE_URL is not set, so the app would use a local file (data is lost on Render restarts)");
  failures++;
} else {
  try {
    const t0 = Date.now();
    const db = await getDb();
    await db.prepare("SELECT 1 AS ok").get();
    const counts = {};
    for (const t of ["students", "sessions", "videos", "comments"]) {
      counts[t] = (await db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get()).n;
    }
    ok(`Connected to Turso in ${Date.now() - t0} ms; tables ready (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")})`);
  } catch (err) {
    bad(`Turso: ${err.message}`);
    if (!/is not set/.test(err.message) && /401|unauthor|token|JWT/i.test(String(err.message))) console.log("    The auth token was rejected. Create a new one in the Turso dashboard.");
    failures++;
  }
}

console.log("\nVideo storage");
if (!cloudinaryEnabled) {
  bad("Cloudinary variables are missing, so videos would be saved on Render's temporary disk");
  failures++;
} else {
  const info = storageInfo();
  if (info.warning) { bad(info.warning); failures++; }
  try {
    const ticket = directUploadTicket("setup-check");
    const form = new FormData();
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, String(v));
    form.append("file", new Blob([Buffer.from(TINY_MP4, "base64")], { type: "video/mp4" }), "setup-check.mp4");
    const res = await fetch(ticket.uploadUrl, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const problem = verifyUploadResult(data, "setup-check");
    if (problem) throw new Error(`Upload worked but verification failed: ${problem}`);
    ok(`Signed upload works (test clip ${data.public_id}, ${data.bytes} bytes)`);
    if (await destroyCloudinary(data.public_id)) ok("Delete works (test clip removed)");
    else { bad("Couldn't delete the test clip. Check the API secret"); failures++; }
  } catch (err) {
    bad(`Cloudinary: ${err.message}`);
    if (/cloud_name|Invalid cloud|not found|404/i.test(err.message)) console.log("    Check CLOUDINARY_CLOUD_NAME (Settings > API Keys > Cloud name).");
    if (/api_key|Invalid Signature|401/i.test(err.message)) console.log("    Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
    failures++;
  }
}

console.log("\nInstructor login");
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "guitar_admin") {
  bad("ADMIN_PASSWORD is the default 'guitar_admin'. Pick your own before going live");
  failures++;
} else ok("Custom instructor password set");

console.log(failures ? `\n${failures} thing(s) to fix.\n` : "\nAll good. Ready to deploy.\n");
process.exit(failures ? 1 : 0);
