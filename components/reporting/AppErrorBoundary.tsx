import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { ErrorState } from "@/components/ui/ErrorState";
import { t } from "@/hooks/useTranslation";
import { reportError } from "@/lib/reporting/errorReport";

type Props = { children: ReactNode; route?: string };
type State = { hasError: boolean };

/**
 * Global render-error boundary. Mount once in app/_layout.tsx.
 * Shows a localized, non-technical fallback; reports a redacted error.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    try {
      reportError(error, { operation: "render", route: this.props.route });
    } catch {
      // never throw from the boundary
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      let title = "Une erreur est survenue";
      let body = "Quelque chose s'est mal passé. Réessaie.";
      try {
        title = t("errors.crash.title");
        body = t("errors.crash.body");
      } catch {
        // fall back to defaults
      }
      return (
        <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
          <ErrorState
            title={title}
            message={body}
            onRetry={this.handleRetry}
            testID="app-error-boundary"
          />
        </View>
      );
    }
    return this.props.children;
  }
}
