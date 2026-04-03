// ЗАМЕНИ ТОЛЬКО ЭТУ ФУНКЦИЮ в файле app/p/[slug]/page.tsx
// Найди: function buildLandingIframeSrcDoc(compiledJs: string): string {
// И замени всю функцию целиком на это:

function buildLandingIframeSrcDoc(compiledJs: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet">
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body style="margin:0;padding:0;overflow-x:hidden;">
<div id="root"></div>
<script>
// Expose ALL React hooks as globals
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
const useCallback = React.useCallback;
const useMemo = React.useMemo;
const useReducer = React.useReducer;
const useContext = React.useContext;
const createContext = React.createContext;
const Fragment = React.Fragment;
${compiledJs}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(LandingPage));
</script>
</body>
</html>`;
}