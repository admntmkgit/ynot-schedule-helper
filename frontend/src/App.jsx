/**
 * Main App Component
 * Sets up routing for the application
 */
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './App.css';

function App() {
    return <RouterProvider router={router} />;
}

export default App;

