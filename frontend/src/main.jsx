import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { this.setState({ error }); console.error(error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600 bg-red-50 min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mb-4">Bir şeyler ters gitti.</h1>
            <pre className="bg-white p-4 rounded border border-red-200 text-sm overflow-auto max-w-full">
                {this.state.error?.toString()}
            </pre>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg shadow">Yeniden Yükle</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
)
