// Valida que el email tenga un formato válido
export const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
};

// Valida que el username tenga un formato válido
export const validateUsername = (username) => {
    const regex = /^[a-zA-Z0-9]{4,20}$/;
    return regex.test(username);
};

// Valida que la contraseña tenga una longitud valida
export const validatePasswordLength = (password) => {
    return password.length >= 8;
};

// Valida que la contraseña tenga al menos una letra minúscula, una letra mayúscula, un número y un carácter especial
export const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/;
    return regex.test(password);
};

// Valida que el nombre tenga un formato válido
export const validateName = (name) => {
    const regex = /^[a-zA-ZÀ-ÿ\s]{1,50}$/;
    return regex.test(name);
};

// Valida que el apellido tenga un formato válido
export const validatePhone = (phone) => {
    const regex = /^[0-9]{10}$/;
    return regex.test(phone);
};
