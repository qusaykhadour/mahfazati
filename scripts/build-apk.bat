@echo off
rem بناء APK محلياً.
rem السبب: مسار المشروع طويل جداً على ويندوز (حد MAX_PATH في CMake/ninja)،
rem فنستخدم قرص subst قصير Z: يشير إلى جذر المشروع.
rem أنشئه أولاً:  subst Z: <مسار-المشروع>
setlocal
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
cd /d Z:\mobile\android
call Z:\mobile\android\gradlew.bat assembleRelease --init-script Z:\mobile\scripts\mirror.init.gradle -PreactNativeArchitectures=arm64-v8a --max-workers=2
exit /b %ERRORLEVEL%
