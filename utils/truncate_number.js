function truncate_number(value, decimals) {
  const valueStr = value.toString();
  const dotIndex = valueStr.indexOf('.');
  if (dotIndex === -1) return valueStr;
  const desiredLength = dotIndex + decimals + 1;
  let truncated = valueStr.slice(0, desiredLength);

  if (parseFloat(truncated) === 0 && value > 0) {
      return valueStr;
  }
  return truncated;
}

module.exports = { truncate_number };