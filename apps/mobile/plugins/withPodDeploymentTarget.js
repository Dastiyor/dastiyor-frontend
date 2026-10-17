/**
 * Raise every CocoaPods target to at least iOS 15.1.
 *
 * Xcode 27 refuses deployment targets below 15.0, and several pods (Sentry,
 * GoogleSignIn, RevenueCat, …) still declare 9.0–13.0, which fails the EAS
 * archive. RevenueCat's Expo guide recommends this post_install hook for
 * Xcode 27 on Expo SDK 56 or earlier; drop it once the pods catch up.
 */
const { withPodfile } = require('expo/config-plugins');

const MIN = '15.1';
const MARKER = '# dastiyor: minimum pod deployment target';

module.exports = function withPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;
    // Append at the end of the post_install block, after react_native_post_install,
    // so nothing later in the block resets the targets.
    const start = podfile.search(/^([ \t]*)post_install do \|installer\|/m);
    if (start === -1) throw new Error('withPodDeploymentTarget: no post_install block in the Podfile');
    const indent = podfile.slice(start).match(/^([ \t]*)/)[1];
    const close = podfile.indexOf(`\n${indent}end\n`, start);
    if (close === -1) throw new Error('withPodDeploymentTarget: post_install block has no end');
    const inner = `${indent}  `;
    const hook = [
      `${inner}${MARKER}`,
      `${inner}installer.pods_project.targets.each do |target|`,
      `${inner}  target.build_configurations.each do |build_config|`,
      `${inner}    current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']`,
      `${inner}    if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN}')`,
      `${inner}      build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'`,
      `${inner}    end`,
      `${inner}  end`,
      `${inner}end`,
    ].join('\n');
    cfg.modResults.contents = `${podfile.slice(0, close)}\n${hook}${podfile.slice(close)}`;
    return cfg;
  });
};
