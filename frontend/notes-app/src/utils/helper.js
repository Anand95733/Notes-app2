export  const validateEmail = (email) =>{
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export const getInitials = (name) =>{
    if(!name) return "";
    const words = name.split(" ");
    return words.map((word) => word[0].toUpperCase()).join("");
}