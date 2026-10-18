Pod::Spec.new do |s|
  s.name           = 'SessionRuntime'
  s.version        = '1.0.0'
  s.summary        = 'Screen-off workout session timer with spoken cues'
  s.description    = 'Owns session timing, cues, and background execution for Zero to 5K.'
  s.author         = ''
  s.homepage       = 'https://github.com/ckbk456/zero-to-5k'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit', 'AVFoundation', 'CallKit', 'AudioToolbox'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
  s.resource_bundles = { 'SessionRuntime' => ['chime.wav'] }
end
