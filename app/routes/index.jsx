// app/routes/index.jsx

export default function Index() {
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        maxWidth: "600px",
        margin: "0 auto"
      }}
    >
      <img
        src="https://acoustic-union.com/logo-black.svg"
        alt="Acoustic Union"
        style={{ width: "180px", marginBottom: "2rem" }}
      />

      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Order Send to Minimax</h1>
      <p style={{ fontSize: "1.1rem", color: "#444" }}>
        This app allows you to easily transfer Shopify orders to your <strong>Minimax ERP</strong> system.
      </p>

      <hr style={{ margin: "2rem 0" }} />

      <p style={{ fontSize: "0.9rem", color: "#888" }}>
        To use this app, open any order in the Shopify admin and click the <strong>“Send to Minimax”</strong> action
        from the More Actions dropdown.
      </p>
    </div>
  );
}