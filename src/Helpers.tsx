/* Function that takes in a string number and outputs comma-separated digits */
export function formatNumberWithCommas(num: number) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}