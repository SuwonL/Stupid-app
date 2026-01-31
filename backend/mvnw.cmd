@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements. See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership. The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License. You may obtain a copy of the License at
@REM
@REM http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied. See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM Required ENV vars: JAVA_HOME - location of a JDK home dir
@REM ----------------------------------------------------------------------------

@echo off
@REM set title of command window
title %0
if "%HOME%" == "" (set "HOME=%HOMEDRIVE%%HOMEPATH%")

@setlocal
set ERROR_CODE=0

@REM ==== VALIDATION (JAVA_HOME or auto-detect common JDK paths) ====
if not "%JAVA_HOME%" == "" goto OkJHome
@REM Try common JDK locations on Windows
for /d %%d in ("C:\Program Files\Java\jdk*") do if exist "%%d\bin\java.exe" (set "JAVA_HOME=%%d" & goto OkJHome)
for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk*") do if exist "%%d\bin\java.exe" (set "JAVA_HOME=%%d" & goto OkJHome)
for /d %%d in ("%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk*") do if exist "%%d\bin\java.exe" (set "JAVA_HOME=%%d" & goto OkJHome)
for /d %%d in ("%USERPROFILE%\.jdks\*") do if exist "%%d\bin\java.exe" (set "JAVA_HOME=%%d" & goto OkJHome)
echo.
echo Error: JAVA_HOME not found. No JDK found in common locations. >&2
echo 1. Install JDK 17+ (e.g. Eclipse Temurin: https://adoptium.net ) >&2
echo 2. Set JAVA_HOME for this session, e.g.: >&2
echo    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot" >&2
echo    Then run: .\mvnw.cmd spring-boot:run >&2
echo.
goto error
:OkJHome
if exist "%JAVA_HOME%\bin\java.exe" goto init
echo.
echo Error: JAVA_HOME is set to an invalid directory. >&2
echo JAVA_HOME = "%JAVA_HOME%" >&2
echo.
goto error
@REM ==== END VALIDATION ====

:init
set MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF NOT "%MAVEN_PROJECTBASEDIR%"=="" goto endDetectBaseDir
set EXEC_DIR=%CD%
set WDIR=%EXEC_DIR%
:findBaseDir
IF EXIST "%WDIR%"\.mvn goto baseDirFound
cd ..
IF "%WDIR%"=="%CD%" goto baseDirNotFound
set WDIR=%CD%
goto findBaseDir
:baseDirFound
set MAVEN_PROJECTBASEDIR=%WDIR%
cd "%EXEC_DIR%"
goto endDetectBaseDir
:baseDirNotFound
set MAVEN_PROJECTBASEDIR=%EXEC_DIR%
cd "%EXEC_DIR%"
:endDetectBaseDir

IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config" goto endReadAdditionalConfig
@setlocal EnableExtensions EnableDelayedExpansion
for /F "usebackq delims=" %%a in ("%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config") do set JVM_CONFIG_MAVEN_PROPS=!JVM_CONFIG_MAVEN_PROPS! %%a
@endlocal & set JVM_CONFIG_MAVEN_PROPS=%JVM_CONFIG_MAVEN_PROPS%
:endReadAdditionalConfig

@REM Do not put quotes in variables - use quotes only when invoking (paths with spaces)
set "MAVEN_JAVA_EXE=%JAVA_HOME%\bin\java.exe"
set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

set DOWNLOAD_URL="https://repo.maven.apache.org/maven2/io/takari/maven-wrapper/0.5.6/maven-wrapper-0.5.6.jar"
FOR /F "tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
 IF "%%A"=="wrapperUrl" SET DOWNLOAD_URL=%%B
)

if exist %WRAPPER_JAR% goto run
if not "%MVNW_VERBOSE%" == "" (
 echo Couldn't find %WRAPPER_JAR%, downloading it ...
 echo Downloading from: %DOWNLOAD_URL%
)
powershell -Command "&{[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%WRAPPER_JAR%')}"
if not exist %WRAPPER_JAR% (
 echo Failed to download maven-wrapper.jar
 goto error
)
:run

set MAVEN_CMD_LINE_ARGS=%*
"%MAVEN_JAVA_EXE%" %JVM_CONFIG_MAVEN_PROPS% %MAVEN_OPTS% -classpath "%WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
if ERRORLEVEL 1 goto error
goto end
:error
set ERROR_CODE=1
:end
@endlocal & set ERROR_CODE=%ERROR_CODE%
exit /B %ERROR_CODE%
