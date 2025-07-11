import React, { useState, useEffect } from "react";
import { WelcomePage } from "./welcome-page.tsx";
import { MainApplicationPage } from "../pages/main-application-page.tsx";
import { AgentService } from "../../agent/service/agent-service.ts";
import { UIStateService } from "../service/ui-state-service.ts";

interface AppContainerProps {
  agentService: AgentService;
  uiStateService: UIStateService;
}

export const AppContainer: React.FC<AppContainerProps> = ({
  agentService,
  uiStateService
}: AppContainerProps) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <WelcomePage />;
  }

  return (
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
};