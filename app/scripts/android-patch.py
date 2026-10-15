#!/usr/bin/env python3
"""Idempotent Android project setup for Galim (run after `npx cap add android`)."""
import os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', 'android')
MAIN = os.path.join(ROOT, 'app', 'src', 'main')

# ---- manifest ----
mp = os.path.join(MAIN, 'AndroidManifest.xml')
m = open(mp, encoding='utf-8').read()
if 'xmlns:tools' not in m:
    m = m.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
                  '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">')
m = m.replace('android:allowBackup="true"', 'android:allowBackup="false"\n        android:fullBackupContent="false"\n        android:dataExtractionRules="@xml/data_extraction_rules"')
if 'android:screenOrientation' not in m:
    m = m.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"')
perm_block = '''    <!-- Permissions -->
    <!-- No network at all: the app is served from local assets. -->
    <uses-permission android:name="android.permission.INTERNET" tools:node="remove" />
    <!-- Daily reminder is an inexact alarm; exact alarms are not used. -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" tools:node="remove" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
'''
m = re.sub(r'    <!-- Permissions -->.*?(?=</manifest>)', perm_block, m, flags=re.S)
open(mp, 'w', encoding='utf-8').write(m)

# ---- backup rules: exclude everything (data is device-only) ----
xml = os.path.join(MAIN, 'res', 'xml')
os.makedirs(xml, exist_ok=True)
open(os.path.join(xml, 'data_extraction_rules.xml'), 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" />
        <exclude domain="file" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" />
        <exclude domain="file" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </device-transfer>
</data-extraction-rules>
''')

# ---- names ----
open(os.path.join(MAIN, 'res', 'values', 'strings.xml'), 'w', encoding='utf-8').write('''<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">גלים</string>
    <string name="title_activity_main">גלים</string>
    <string name="package_name">com.binrozenblum.galim</string>
    <string name="custom_url_scheme">com.binrozenblum.galim</string>
</resources>
''')
os.makedirs(os.path.join(MAIN, 'res', 'values-en'), exist_ok=True)
open(os.path.join(MAIN, 'res', 'values-en', 'strings.xml'), 'w', encoding='utf-8').write('''<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Galim</string>
    <string name="title_activity_main">Galim</string>
</resources>
''')

# ---- notification small icon (white waves) ----
dr = os.path.join(MAIN, 'res', 'drawable')
os.makedirs(dr, exist_ok=True)
open(os.path.join(dr, 'ic_stat_galim.xml'), 'w').write('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="#00000000"
        android:pathData="M3,8.5c2,-1.8 3.8,-1.8 5.8,0s3.8,1.8 5.8,0 3.8,-1.8 5.8,0" />
    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="#00000000"
        android:pathData="M3,13c2,-1.8 3.8,-1.8 5.8,0s3.8,1.8 5.8,0 3.8,-1.8 5.8,0" />
    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="#00000000"
        android:pathData="M3,17.5c2,-1.8 3.8,-1.8 5.8,0s3.8,1.8 5.8,0 3.8,-1.8 5.8,0" />
</vector>
''')

# ---- gradle: version + release signing from keystore.properties ----
gp = os.path.join(ROOT, 'app', 'build.gradle')
g = open(gp, encoding='utf-8').read()
g = g.replace('versionName "1.0"', 'versionName "1.0.0"')
if 'keystorePropertiesFile' not in g:
    g = g.replace("apply plugin: 'com.android.application'\n",
"""apply plugin: 'com.android.application'

def keystorePropertiesFile = rootProject.file('keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
""", 1)
    g = g.replace("    buildTypes {\n        release {\n            minifyEnabled false",
"""    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false""", 1)
open(gp, 'w', encoding='utf-8').write(g)
print('android patched')
