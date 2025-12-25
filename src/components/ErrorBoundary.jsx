import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false, error: null }; 
  }

  static getDerivedStateFromError(error) { 
    return { hasError: true, error }; 
  }

  componentDidCatch(error, errorInfo) { 
    console.error("Erro capturado:", error, errorInfo); 
  }

  render() {
    if (this.state.hasError) return (
      <div className="p-10 text-red-600 bg-red-50 h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Ops! Ocorreu um erro.</h1>
        <p className="bg-white p-4 border rounded mb-4 text-sm font-mono text-gray-800">
          {this.state.error?.message}
        </p>
        <button 
          onClick={() => window.location.href='/'} 
          className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700"
        >
          Reiniciar Sistema
        </button>
      </div>
    );
    return this.props.children;
  }
}