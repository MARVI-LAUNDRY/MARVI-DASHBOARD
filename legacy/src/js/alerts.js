/* global Swal */

/* Mensaje de carga con loader y sin aceptación */
export const alertLoading = (_title, _text) => {
    Swal.fire({
        iconHtml: `
            <div class="alert-loader">
                <div class="washer-loader">
                    <div class="washer">
                        <div class="door">
                            <div class="clothes"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        title: _title,
        text: _text,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        timerProgressBar: true,
        customClass: {
            popup: "alert-popup",
        },
    });
};

/* Mensaje sencillo con aceptación y temporizador opcional */
export const alertMessage = async (_title, _text, _icon, _timer = 2500) => {
    const res = await Swal.fire({
        title: _title,
        text: _text,
        icon: _icon,
        timer: _timer,
        showConfirmButton: true,
        confirmButtonText: "Aceptar",
        allowOutsideClick: false,
        timerProgressBar: true,
        customClass: {
            popup: "alert-popup",
            confirmButton: "alert-confirm",
        },
    });
    return res.isConfirmed;
};

/* Mensaje de confirmación con aceptación y cancelación */
export const alertConfirm = async (_title, _text, _icon) => {
    const res = await Swal.fire({
        title: _title,
        text: _text,
        icon: _icon,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: "Aceptar",
        cancelButtonText: "Cancelar",
        allowOutsideClick: false,
        customClass: {
            popup: "alert-popup",
            confirmButton: "alert-confirm",
            cancelButton: "alert-cancel",
        },
    });
    return res.isConfirmed;
};

/* Toast de notificación con temporizador */
export const alertToast = async (_title, _text, _icon, _position, _timer = 1500) => {
    const Toast = Swal.mixin({
        toast: true,
        position: _position,
        timer: _timer,
        showConfirmButton: false,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        },
    });
    const res = await Toast.fire({
        title: _title,
        text: _text,
        icon: _icon,
        customClass: {
            popup: "alert-popup",
        },
    });
    return res.isConfirmed;
};
