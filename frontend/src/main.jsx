import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Hata Kalkanı (Error Boundary) - Beyaz Ekranı Önler
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Ascari Dashboard Hatası:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-2xl border-2 border-red-200 max-w-3xl w-full">
            <h1 className="text-3xl font-bold text-red-600 mb-4 flex items-center">
              ⚠️ Beklenmedik Bir Hata Oluştu
            </h1>
            <p className="text-slate-700 mb-6 text-lg">
              Uygulama çalışırken teknik bir sorunla karşılaştı. Lütfen aşağıdaki hata detayını teknik ekibe iletiniz.
            </p>
            
            <div className="bg-slate-900 text-green-400 p-6 rounded-lg text-sm font-mono overflow-auto max-h-96 shadow-inner border border-slate-700">
              <p className="font-bold text-red-400 mb-2">Hata Mesajı:</p>
              {this.state.error && this.state.error.toString()}
              <br /><br />
              <p className="font-bold text-yellow-400 mb-2">Kod Yığını (Stack Trace):</p>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-lg"
              >
                Sayfayı Yenile ve Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
