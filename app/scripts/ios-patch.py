#!/usr/bin/env python3
"""Idempotent iOS project setup for Galim (run after `npx cap add ios`)."""
import os, plistlib, re

ROOT = os.path.join(os.path.dirname(__file__), '..', 'ios', 'App')
APP = os.path.join(ROOT, 'App')
PBX = os.path.join(ROOT, 'App.xcodeproj', 'project.pbxproj')

# ---- Info.plist ----
ip = os.path.join(APP, 'Info.plist')
with open(ip, 'rb') as f:
    p = plistlib.load(f)
p['CFBundleDevelopmentRegion'] = 'he'
p['CFBundleLocalizations'] = ['he', 'en']
p['CFBundleDisplayName'] = 'גלים'
p['CFBundleName'] = 'Galim'
p['NSFaceIDUsageDescription'] = 'גלים משתמש בזיהוי פנים כדי לנעול את היומן שלך.'
p['ITSAppUsesNonExemptEncryption'] = False
p['UISupportedInterfaceOrientations'] = ['UIInterfaceOrientationPortrait']
p.pop('UISupportedInterfaceOrientations~ipad', None)
p['UIRequiredDeviceCapabilities'] = ['arm64']
p['UIRequiresFullScreen'] = True
p['UIStatusBarStyle'] = 'UIStatusBarStyleDarkContent'
with open(ip, 'wb') as f:
    plistlib.dump(p, f)

# ---- localized InfoPlist.strings ----
strings = {
    'he': {'CFBundleDisplayName': 'גלים', 'NSFaceIDUsageDescription': 'גלים משתמש בזיהוי פנים כדי לנעול את היומן שלך.'},
    'en': {'CFBundleDisplayName': 'Galim', 'NSFaceIDUsageDescription': 'Galim uses Face ID to lock your diary.'},
}
for lang, kv in strings.items():
    d = os.path.join(APP, f'{lang}.lproj')
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'InfoPlist.strings'), 'w', encoding='utf-8') as f:
        for k, v in kv.items():
            f.write(f'"{k}" = "{v}";\n')

# ---- privacy manifest ----
priv = {
    'NSPrivacyTracking': False,
    'NSPrivacyTrackingDomains': [],
    'NSPrivacyCollectedDataTypes': [],
    'NSPrivacyAccessedAPITypes': [
        {'NSPrivacyAccessedAPIType': 'NSPrivacyAccessedAPICategoryUserDefaults', 'NSPrivacyAccessedAPITypeReasons': ['CA92.1']},
        {'NSPrivacyAccessedAPIType': 'NSPrivacyAccessedAPICategoryFileTimestamp', 'NSPrivacyAccessedAPITypeReasons': ['C617.1']},
    ],
}
with open(os.path.join(APP, 'PrivacyInfo.xcprivacy'), 'wb') as f:
    plistlib.dump(priv, f)

# ---- pbxproj ----
s = open(PBX, encoding='utf-8').read()
if 'GA11E0000000000000000005' not in s:
    s = s.replace('/* End PBXBuildFile section */',
        '\t\tGA11E0000000000000000005 /* InfoPlist.strings in Resources */ = {isa = PBXBuildFile; fileRef = GA11E0000000000000000004 /* InfoPlist.strings */; };\n'
        '\t\tGA11E0000000000000000007 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = GA11E0000000000000000006 /* PrivacyInfo.xcprivacy */; };\n'
        '/* End PBXBuildFile section */')
    s = s.replace('/* End PBXFileReference section */',
        '\t\tGA11E0000000000000000002 /* he */ = {isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = he; path = he.lproj/InfoPlist.strings; sourceTree = "<group>"; };\n'
        '\t\tGA11E0000000000000000003 /* en */ = {isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = en; path = en.lproj/InfoPlist.strings; sourceTree = "<group>"; };\n'
        '\t\tGA11E0000000000000000006 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n'
        '/* End PBXFileReference section */')
    s = s.replace('\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n\t\t\t);\n\t\t\tpath = App;',
        '\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n\t\t\t\tGA11E0000000000000000004 /* InfoPlist.strings */,\n\t\t\t\tGA11E0000000000000000006 /* PrivacyInfo.xcprivacy */,\n\t\t\t);\n\t\t\tpath = App;')
    s = re.sub(r'(504EC3021FED79650016851F /\* Resources \*/ = \{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = \d+;\n\t\t\tfiles = \(\n)',
        r'\1\t\t\t\tGA11E0000000000000000005 /* InfoPlist.strings in Resources */,\n\t\t\t\tGA11E0000000000000000007 /* PrivacyInfo.xcprivacy in Resources */,\n', s)
    s = s.replace('/* End PBXProject section */', '/* End PBXProject section */', 1)
    s = s.replace('/* Begin PBXVariantGroup section */',
        '/* Begin PBXVariantGroup section */\n'
        '\t\tGA11E0000000000000000004 /* InfoPlist.strings */ = {\n\t\t\tisa = PBXVariantGroup;\n\t\t\tchildren = (\n'
        '\t\t\t\tGA11E0000000000000000002 /* he */,\n\t\t\t\tGA11E0000000000000000003 /* en */,\n\t\t\t);\n'
        '\t\t\tname = InfoPlist.strings;\n\t\t\tsourceTree = "<group>";\n\t\t};')
s = s.replace('knownRegions = (\n\t\t\t\ten,\n\t\t\t\tBase,\n\t\t\t);', 'knownRegions = (\n\t\t\t\ten,\n\t\t\t\the,\n\t\t\t\tBase,\n\t\t\t);')
s = s.replace('developmentRegion = en;', 'developmentRegion = he;')
s = s.replace('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;')
s = s.replace('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 1.0.0;')
open(PBX, 'w', encoding='utf-8').write(s)
print('ios patched')
