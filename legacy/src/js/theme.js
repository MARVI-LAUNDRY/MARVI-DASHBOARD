// Obtiene o crea el tema actual del localStorage
let currentTheme = localStorage.getItem("theme") || "light";

// Cambia el tema de la página
const theme = (color) => {
    document.documentElement.style.setProperty("--background", `var(--background-${color})`);
    document.documentElement.style.setProperty("--background-content", `var(--background-content-${color})`);
    document.documentElement.style.setProperty("--border", `var(--border-${color})`);
    document.documentElement.style.setProperty("--hover-border", `var(--hover-border-${color})`);
    document.documentElement.style.setProperty("--text", `var(--text-${color})`);
    document.documentElement.style.setProperty("--placeholder", `var(--placeholder-${color})`);
    localStorage.setItem("theme", color);
    currentTheme = color;
};

// Cambia el tema actual
export const changeTheme = () => {
    theme(currentTheme === "light" ? "dark" : "light");
};

// Carga el tema actual
export const loadTheme = () => {
    theme(currentTheme);
    document.documentElement.style.opacity = 1;
};
