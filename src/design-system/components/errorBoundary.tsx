import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from './controls';
import { EmptyState } from './feedback';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Último límite de recuperación del árbol React. No depende de i18n ni del
 * estado del proyecto porque cualquiera de ellos puede haber provocado el
 * error. Los proyectos ya persistidos siguen fuera de este árbol.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[FusionStructure] Unhandled render error', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="sc-error-boundary" role="alert">
        <EmptyState
          icon={<TriangleAlert size={22} />}
          title="Algo se rompió en FusionStructure · Something broke in FusionStructure"
          description={<>Ocurrió un error inesperado. Tus proyectos guardados permanecen en este navegador.<br />An unexpected error occurred. Your saved projects remain in this browser.</>}
          action={<Button variant="primary" onClick={this.handleReload}>Recargar · Reload</Button>}
        />
      </div>
    );
  }
}
