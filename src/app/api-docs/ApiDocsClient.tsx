"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

// swagger-ui-react는 ReactDOM.findDOMNode를 사용하는데 React 19에서 완전히 제거되어 마운트 시 크래시난다.
// 그래서 swagger-ui-dist(바닐라 JS 번들)를 직접 DOM에 마운트하는 방식으로 우회한다.
export default function ApiDocsClient() {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    Promise.all([
      import("swagger-ui-dist/swagger-ui-bundle.js"),
      import("swagger-ui-dist/swagger-ui-standalone-preset.js"),
    ]).then(([bundleModule, presetModule]) => {
      const SwaggerUIBundle = (bundleModule as unknown as { default: SwaggerUIBundleFactory }).default;
      const SwaggerUIStandalonePreset = (presetModule as unknown as { default: unknown }).default;

      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
      });
    });
  }, []);

  return <div id="swagger-ui" />;
}

type SwaggerUIBundleFactory = {
  (config: Record<string, unknown>): unknown;
  presets: { apis: unknown };
  plugins: { DownloadUrl: unknown };
};
