const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function guardRequestOrigin(origins) {
  const allowedOrigins = new Set(origins);
  return (req, res, next) => {
    if (safeMethods.has(req.method)) return next();

    const origin = req.get("origin");
    const fetchSite = req.get("sec-fetch-site");
    if ((origin && !allowedOrigins.has(origin)) || fetchSite === "cross-site") {
      return res.status(403).json({ error: "This request origin is not allowed." });
    }
    return next();
  };
}
