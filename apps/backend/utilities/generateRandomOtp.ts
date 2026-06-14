export const generateOtp = (digits: number) => {
  return Math.floor(Math.random() * 900000 + 100000)
    .toString()
    .slice(0, digits);
};
