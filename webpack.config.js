const { merge } = require("webpack-merge");
const singleSpaDefaults = require("webpack-config-single-spa-react-ts");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = (webpackConfigEnv, argv) => {
  const defaultConfig = singleSpaDefaults({
    orgName: "org",
    projectName: "mfe-hero-discovery",
    webpackConfigEnv,
    argv,
    outputSystemJS: true,
    disableHtmlGeneration: true,
  });

  defaultConfig.resolve = defaultConfig.resolve || {};

  /* ── Prioritise .ts/.tsx so Webpack picks ESM sources in libs/ ── */
  defaultConfig.resolve.extensions = [
    ".ts", ".tsx", ".mjs", ".js", ".jsx", ".wasm", ".json",
  ];

  const baseExternals = defaultConfig.externals;
  const allowBundle = new Set([
    "@mfe-sols/ui-kit",
    "@mfe-sols/i18n",
    "react",
    "react-dom",
    "react-dom/client",
  ]);
  const customExternals = ({ context, request }, callback) => {
    if (allowBundle.has(request)) {
      return callback();
    }
    if (typeof baseExternals === "function") {
      if (baseExternals.length <= 2) {
        return baseExternals({ context, request }, callback);
      }
      return baseExternals(context, request, callback);
    }
    if (Array.isArray(baseExternals)) {
      for (const ext of baseExternals) {
        if (typeof ext === "function") {
          let handled = false;
          const onResult = (err, result) => {
            if (err) return callback(err);
            if (result !== undefined) {
              handled = true;
              return callback(null, result);
            }
          };
          if (ext.length <= 2) {
            ext({ context, request }, onResult);
          } else {
            ext(context, request, onResult);
          }
          if (handled) return;
        } else if (typeof ext === "object" && ext[request]) {
          return callback(null, ext[request]);
        }
      }
      return callback();
    }
    return callback();
  };

  /* ── Remove auto-generated standalone HTML ── */
  defaultConfig.plugins = (defaultConfig.plugins || []).filter(
    (p) => p && p.constructor &&
      p.constructor.name !== "StandaloneSingleSpaPlugin" &&
      p.constructor.name !== "ForkTsCheckerWebpackPlugin"
  );

  return merge(defaultConfig, {
    cache: { type: "filesystem" },
    performance: { hints: false },
    externals: customExternals,
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: "public",
            to: ".",
            globOptions: { ignore: ["**/.DS_Store"] },
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    devServer: {
      ...(defaultConfig.devServer || {}),
      allowedHosts: "all",
      static: [
        { directory: path.resolve(__dirname, "public"), publicPath: "/" },
      ],
      headers: {
        ...((defaultConfig.devServer && defaultConfig.devServer.headers) || {}),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  });
};
