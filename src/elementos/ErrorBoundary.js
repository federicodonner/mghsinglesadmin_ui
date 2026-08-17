import React from "react";
import "./errorBoundary.css";

// Without this, a render-time TypeError anywhere in the tree unmounts the whole
// app and leaves a blank white page with nothing on screen to explain it —
// which is exactly how a stale field name (card.cardset vs card.cardsetcode)
// presented itself. React only recovers via a class component; there is no
// hook equivalent.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the stack in the console; the panel below stays deliberately terse.
    console.error("Render failed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="errorBoundary">
        <h2>Algo salió mal</h2>
        <p>
          Ocurrió un error mostrando esta página. Puedes recargar e intentar
          nuevamente.
        </p>
        <button
          className="dark"
          onClick={() => this.setState({ error: null })}
        >
          Reintentar
        </button>
        <button className="dark" onClick={() => window.location.reload()}>
          Recargar
        </button>
        {/* The message is useful while developing and harmless in production —
            it names the failure rather than leaving a blank screen. */}
        <pre className="errorDetail">{String(this.state.error)}</pre>
      </div>
    );
  }
}
