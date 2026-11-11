export const STANDALONE_HTML_CODE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>VoxelWorld — Modo Supervivencia (1 Jugador)</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none;}
body{overflow:hidden;background:#05070b;font-family:'Segoe UI',system-ui,sans-serif;}
canvas{display:block;width:100vw;height:100vh;}

/* OVERLAY DE INICIO */
#overlay{
  position:absolute;inset:0;
  background:radial-gradient(circle at 50% 35%, rgba(16,36,28,0.82), rgba(6,10,15,0.94));
  backdrop-filter:blur(10px);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:#f8fafc;z-index:200;
}
#overlay h1{
  font-size:56px;font-weight:900;letter-spacing:4px;
  color:#4ade80;
  text-shadow:0 0 18px rgba(74,222,128,0.55),0 0 36px rgba(34,211,238,0.35);
  margin-bottom:6px;
}
.sub{
  font-size:12px;color:#22d3ee;letter-spacing:5px;text-transform:uppercase;
  margin-bottom:28px;text-shadow:0 0 10px rgba(34,211,238,0.45);
}
#btnPlay{
  background:rgba(16,185,129,0.22);
  color:#ecfdf5;font-size:20px;font-weight:900;padding:15px 60px;
  border-radius:12px;border:1px solid rgba(74,222,128,0.65);
  cursor:pointer;margin-bottom:28px;
  box-shadow:0 0 28px rgba(74,222,128,0.35),inset 0 0 14px rgba(34,211,238,0.2);
  transition:transform .14s ease,box-shadow .14s ease,background .14s ease;
  letter-spacing:2px;text-shadow:0 0 10px rgba(74,222,128,0.6);
}
#btnPlay:hover{
  transform:scale(1.05);
  background:rgba(16,185,129,0.35);
  box-shadow:0 0 42px rgba(74,222,128,0.6),inset 0 0 18px rgba(34,211,238,0.35);
}
.cg{
  display:grid;grid-template-columns:1fr 1fr;gap:10px 36px;
  font-size:13px;color:#cbd5e1;
  background:rgba(10,10,15,0.65);
  backdrop-filter:blur(8px);
  padding:20px 32px;border-radius:14px;
  border:1px solid rgba(74,222,128,0.28);
  box-shadow:0 12px 32px rgba(0,0,0,0.55);
  max-width:560px;
}
.cg b{color:#4ade80;text-shadow:0 0 8px rgba(74,222,128,0.45);}
.cg .section{
  grid-column:1/-1;text-align:center;font-size:11px;letter-spacing:3px;
  text-transform:uppercase;color:#22d3ee;margin-bottom:4px;
  border-bottom:1px solid rgba(34,211,238,0.2);padding-bottom:6px;
  text-shadow:0 0 10px rgba(34,211,238,0.5);
}

/* HUD 1 JUGADOR — DARK GLASSMORPHISM */
.phud{position:absolute;inset:0;pointer-events:none;display:none;width:100%;height:100%;}
.xh{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;}
.xh::before,.xh::after{
  content:'';position:absolute;background:#4ade80;border-radius:1px;
  box-shadow:0 0 8px rgba(74,222,128,0.85);
}
.xh::before{width:2px;height:18px;left:8px;top:0;}
.xh::after{width:18px;height:2px;top:8px;left:0;}

/* Botón de Crafteo sobre la Hotbar */
.craft-bar{
  position:absolute;bottom:82px;left:50%;transform:translateX(-50%);
  display:flex;gap:8px;pointer-events:auto;
}
.btn-craft{
  background:rgba(10,10,15,0.65);
  backdrop-filter:blur(8px);
  color:#4ade80;font-size:12px;font-weight:700;
  padding:7px 16px;border-radius:10px;
  border:1px solid rgba(74,222,128,0.45);
  cursor:pointer;
  box-shadow:0 4px 18px rgba(0,0,0,0.55),0 0 12px rgba(74,222,128,0.2);
}

/* Hotbar centrada en la parte inferior con Dark Glassmorphism */
.hb{
  position:absolute;bottom:18px;left:50%;transform:translateX(-50%);
  display:flex;gap:6px;
  background:rgba(10,10,15,0.6);
  backdrop-filter:blur(8px);
  padding:6px 8px;border-radius:12px;
  border:1px solid rgba(74,222,128,0.32);
  box-shadow:0 8px 32px rgba(0,0,0,0.65),0 0 18px rgba(34,211,238,0.14);
}
.sl{
  width:52px;height:52px;border-radius:8px;
  border:1px solid rgba(255,255,255,0.16);
  background:rgba(15,20,28,0.55);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-size:8px;font-weight:700;color:#e2e8f0;position:relative;
}
.sl.on{
  border:2px solid #22d3ee;
  background:rgba(34,211,238,0.18);
  box-shadow:0 0 16px rgba(34,211,238,0.5),inset 0 0 10px rgba(74,222,128,0.25);
  transform:translateY(-3px);
}
.sl .kn{position:absolute;top:3px;left:5px;font-size:8px;color:#22d3ee;}
.sl .ic{font-size:18px;line-height:1;}
.sl .lb{font-size:7px;margin-top:3px;color:#e2e8f0;}
.sl .qty{position:absolute;bottom:2px;right:4px;font-size:9px;color:#4ade80;font-weight:900;}

/* Panel de información (.inf) y Barra de Vida (.hpbar) Dark Glassmorphism */
.inf{
  position:absolute;top:16px;left:16px;
  color:#f1f5f9;font-size:12px;line-height:1.65;
  background:rgba(10,10,15,0.6);
  backdrop-filter:blur(8px);
  padding:10px 16px;border-radius:12px;
  border:1px solid rgba(74,222,128,0.3);
}
.hpbar{
  position:absolute;top:16px;right:16px;
  display:flex;gap:4px;font-size:16px;
  background:rgba(10,10,15,0.6);
  backdrop-filter:blur(8px);
  padding:8px 14px;border-radius:12px;
  border:1px solid rgba(74,222,128,0.3);
}
#toast{
  position:absolute;top:76px;left:50%;transform:translateX(-50%);
  background:rgba(10,10,15,0.78);backdrop-filter:blur(8px);
  color:#4ade80;padding:10px 24px;border-radius:12px;
  font-size:13px;font-weight:700;border:1px solid rgba(34,211,238,0.45);
  display:none;z-index:150;
}
</style>
</head>
<body>
<!-- Ver versión interactiva completa en la aplicación -->
</body>
</html>`;
