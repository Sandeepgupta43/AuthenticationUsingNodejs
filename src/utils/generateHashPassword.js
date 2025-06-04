import bcypt from "bcryptjs"

export const generateHashPassword = (password) => {
    const hashPassword = bcypt.hashSync(password,10);

    return hashPassword;
}