# Fly.io 백엔드 URL이 안 열릴 때

`https://backend-little-cloud-7780.fly.dev/api/ingredients` 를 브라우저에 쳐도 접속이 안 되면, Fly.io 앱이 **꺼져 있거나** **배포가 안 된 상태**일 수 있습니다.

---

## 1. 로컬에서 Fly CLI로 확인

PowerShell에서:

```powershell
cd d:\Cursor\stupid-app\backend
fly auth login
fly status
```

- **`fly status`** 가 앱 정보를 보여주면 → 앱은 존재함. **2번(재배포)** 로 가세요.
- **"app not found"** 또는 로그인/권한 오류면 → 먼저 `fly auth login` 후, 앱이 없으면 **3번(앱 생성)** 으로 가세요.

---

## 2. 앱이 있는데 URL이 안 열릴 때 → 재배포로 기동

`min_machines_running = 0` 이라서 한동안 요청이 없으면 **머신이 꺼집니다**. 꺼진 상태에서는 URL 접속이 안 될 수 있습니다. **다시 배포하면** 머신이 켜집니다.

```powershell
cd d:\Cursor\stupid-app\backend
fly deploy
```

배포가 끝나면 브라우저에서 다시 열어보세요.

- https://backend-little-cloud-7780.fly.dev/api/ingredients

---

## 3. 앱이 아예 없을 때 → 새로 만들기

`fly status` 에서 앱을 못 찾는다면, 같은 폴더에서 한 번만 실행합니다.

```powershell
cd d:\Cursor\stupid-app\backend
fly launch --no-deploy
```

- 기존 `fly.toml` 이 있으면 "App already exists" 또는 덮어쓸지 물어볼 수 있습니다. **기존 앱 이름을 그대로 쓰면** 됩니다.
- 그 다음 배포:

```powershell
fly deploy
```

---

## 4. Fly.io 대시보드에서 확인

1. [fly.io](https://fly.io) 로그인
2. **Apps** 에서 `backend-little-cloud-7780` 선택
3. **Status**: Running 인지, **Metrics** 에서 요청이 오는지 확인
4. **Deployments** 에서 최근 배포가 성공했는지 확인

---

## 5. 무료 플랜에서 꺼짐

`fly.toml` 에 `min_machines_running = 0` 이면 **요청이 없을 때 머신이 자동으로 stop** 됩니다.  
그동안 접속이 안 되다가, **누군가 URL을 열거나 API를 호출하면** Fly가 머신을 다시 켜서, 첫 요청이 10~20초 정도 걸릴 수 있습니다.

- **항상 켜 두고 싶다면**: `min_machines_running = 1` 로 바꾼 뒤 `fly deploy` (무료 한도 초과 시 비용 발생 가능).
- **무료로 쓰려면**: `min_machines_running = 0` 유지하고, 접속이 안 될 때는 위 **2번**처럼 `fly deploy` 로 한 번 다시 배포하면 됩니다.
