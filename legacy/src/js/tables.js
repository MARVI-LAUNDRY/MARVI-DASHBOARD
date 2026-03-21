export const addPlaceholder = () => {
    const tableContainer = document.getElementById("tableContainer");
    tableContainer.classList.add("placeholder", "w-100");

    const spinner = document.createElement("div");
    spinner.classList.add("spinner-container", "position-absolute", "top-50", "start-50");
    spinner.innerHTML = `
        <div class="spinner-border" role="status"></div>
    `;

    tableContainer.appendChild(spinner);
};

export const removePlaceholder = () => {
    const tableContainer = document.getElementById("tableContainer");
    tableContainer.classList.remove("placeholder", "w-100");

    const spinner = document.querySelector(".spinner-container");
    spinner.remove();
};
