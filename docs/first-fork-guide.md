# 첫 포크 실행 가이드 (본인 포트폴리오 + `tools/fork-setup` 실전 테스트)

`docs/fork-checklist.md`를 실제로 한 번 밟아보면서 `tools/fork-setup`을
동시에 검증하기 위한 작업 순서. 일반적인 고객 포크에도 그대로 쓸 수 있지만,
아래 순서는 특히 **`tools/fork-setup/main.py`를 기본 옵션으로 그냥 실행하면
안 되는 이유**를 반영해서 재배열한 것 — 자세한 배경은 맨 아래 "발견한 순서
문제" 참고.

> ⚠️ **`main.py`를 옵션 없이 실행하지 말 것.** 스크립트의 실행 순서는
> 1) 마스터 전용 파일 삭제(`tools/admin-credential-tool` 포함) → 2) 시크릿
> 생성 → 3) 브랜딩 패치 → 4) Tenant INSERT SQL 출력, 순입니다. 그런데
> `tools/admin-credential-tool`로 관리자 계정을 만들려면 4번에서 나오는
> tenant id가 있어야 합니다. 즉 기본 실행하면 정작 필요한 시점엔
> admin-credential-tool이 이미 삭제된 상태가 됩니다. 그래서 1차 실행은
> 반드시 `--skip-delete`를 붙입니다.

## 0. 새 레포로 분리

```bash
git clone https://github.com/tungasa200/portfolio-template-site.git my-portfolio
cd my-portfolio
```

GitHub에 새 저장소(예: `my-portfolio`)를 만든 뒤 origin을 교체:

```bash
git remote set-url origin https://github.com/<본인계정>/my-portfolio.git
git push -u origin main
```

이렇게 해두면 `fork-setup`의 마스터 레포 감지 가드(`git remote get-url
origin`에 `portfolio-template-site` 문자열 포함 여부 체크)가 자연스럽게
통과되어 매번 확인 문구를 타이핑할 필요가 없다.

## 1. 외부 서비스 계정 준비 (수동)

- **Neon**: neon.tech에서 새 프로젝트 생성 → Pooled/Direct 연결 문자열 확보.
- **Cloudflare R2**: 새 버킷 생성 + 새 API 토큰(Access Key ID/Secret) 발급.

값만 받아두고 `.env`에 채우는 건 3단계에서.

## 2. `fork-setup` 1차 실행 — `--skip-delete` 필수

```bash
cd tools/fork-setup
python main.py --dry-run --skip-delete    # 먼저 미리보기
python main.py --skip-delete              # 실제 실행 (프롬프트에 답: site-name/slug/
                                           # owner-name/contact-email/게시판 목록)
```

이 단계에서 자동으로:
- `.env`가 없으면 `.env.example`에서 생성 + `AUTH_SECRET`/`ENCRYPTION_KEY` 채움
- `package.json` / `layout.tsx` / `README.md`에 사이트 이름 반영
- **전체 부트스트랩 SQL과 tenant id 출력** — `Tenant` 행뿐 아니라
  `SiteSettings`/`AboutPage`/Home·About·Contact `NavItem`/입력한 게시판까지
  한 블록으로 나온다. **전부 복사해서 보관** (4·5단계에서 필요). `Tenant` 행만
  넣으면 관리자 사이드바에 "메시지"/"설정"만 남고 게시판·소개·홈 링크가 전혀
  안 뜨는 빈 사이트가 되므로(실제로 한 번 겪은 문제 — 아래 "발견한 문제 2"
  참고), 반드시 출력된 SQL 블록 전체를 4단계에서 실행할 것.

## 3. `.env` 나머지 값 채우기 (수동)

`DATABASE_URL` / `DIRECT_URL`(Neon), `R2_*`(1단계 값), `ROOT_TENANT_SLUG`(2단계
slug와 동일), `HAS_CUSTOM_DOMAIN="false"`(도메인 연결 전까지). `ROOT_DOMAIN`은
로컬 테스트 중엔 `localhost:3000` 그대로.

## 4. DB 셋업 (Neon SQL 에디터 또는 psql)

순서대로 실행:
1. `prisma/security/create-app-role.sql` (본인 비밀번호로 채운 로컬 사본)
2. `prisma/security/rls.sql`
3. `npx prisma migrate deploy` (로컬 테스트면 `npx prisma db push`)
4. 2단계에서 받은 **부트스트랩 SQL 블록 전체** (Tenant + SiteSettings +
   AboutPage + NavItem + Board — 일부만 실행하면 사이트가 여전히 비어보임)

## 5. 관리자 계정 생성 — `admin-credential-tool`이 아직 있는 지금

```bash
cd tools/admin-credential-tool
pip install -r requirements.txt
python main.py
```

- 4단계의 tenant id 입력, 역할은 `TENANT_OWNER`
- "Generate hash + SQL" → 나온 SQL을 Neon에 실행해서 `User` 행 생성
- **비밀번호는 창을 닫으면 복구 불가** — 꼭 복사해서 안전하게 보관.

## 6. 마스터 전용 파일 정리 (수동 삭제)

admin-credential-tool을 다 썼으니 이제 지운다:

```bash
rm -rf tools/ design/ .claude/settings.local.json
```

(`docs/`는 판단 사항 — 계속 유지보수할 계획이면 남겨둬도 무방.)

## 7. 로컬 확인

```bash
npm install
npm run dev
```

`http://localhost:3000`(루트=본인 사이트), `http://admin.localhost:3000/admin/login`에서
5단계 계정으로 로그인 → 대시보드/설정/게시물 등록까지 한 번씩 확인하고 실제
콘텐츠 채우기.

## 8. Vercel 배포 (수동)

- 새 Vercel 프로젝트로 이 저장소 import
- `.env`의 모든 값을 Vercel 프로젝트 환경변수(Production + Preview)에 동일하게
  설정, `HAS_CUSTOM_DOMAIN="false"` 유지
- R2 버킷 CORS `AllowedOrigins`에 실제 `https://<프로젝트>.vercel.app` 추가

커스텀 도메인은 나중에 연결할 때 `ROOT_DOMAIN` 교체 + DNS 와일드카드 확인 후
`HAS_CUSTOM_DOMAIN="true"`로 전환. 지금은 건너뛰어도 됨.

## 발견한 순서 문제 (참고용)

`tools/fork-setup/main.py`의 `main()`은 삭제 → 시크릿 → 브랜딩 → Tenant SQL
순서로 실행되는데, `tools/fork-setup/README.md`의 "What it does" 4번 항목은
"tenant id를 `admin-credential-tool`에서 다시 쓸 것 (그 도구를 지우기 전에)"이라고
안내한다. 하지만 기본 실행(옵션 없음)은 그 도구를 1단계에서 이미 지워버린
뒤에야 tenant id를 4단계에서 출력하므로, 문서의 전제와 실제 실행 순서가
어긋난다. 이 가이드의 2단계에서 `--skip-delete`를 강제하는 이유가 이것 —
근본적으로는 `main.py` 자체의 스텝 순서를 바꾸거나(Tenant SQL을 먼저 출력),
README에 `--skip-delete` 필수 사용을 명시하는 쪽으로 고치는 게 맞다 (아직
미반영).

## 발견한 문제 2: `Tenant` 행만으로는 사이트가 완전히 비어보임 (수정 완료)

첫 실제 포크(2026-07-23)에서 실제로 겪은 문제 — 예전 버전의 `fork-setup`은
`Tenant` 행 하나만 SQL로 출력했다. 그걸로 Vercel 배포까지 마치고 나니
관리자 패널 사이드바에 "메시지"/"설정" 두 개만 보이고 홈/소개/게시판이 전혀
없었다. 원인은 `src/app/admin/(dashboard)/layout.tsx`가 사이드바 항목
전체(HOME/ABOUT/게시판)를 `NavItem` 테이블에서 동적으로 읽어오기 때문 —
`NavItem` 행이 0개면 사이드바에 아무것도 안 뜬다. 게다가 "설정" 저장 버튼도
`SiteSettings.update()`(upsert 아님)를 호출하므로 그 행이 없으면 저장 시
에러가 난다. `AboutPage`도 같은 이유로 필요.

`tools/fork-setup/main.py`를 고쳐서 이제 Step 4가 `Tenant` + `SiteSettings`
+ `AboutPage` + Home/About/Contact `NavItem` + `--board`로 지정한 게시판까지
한 번에 출력하도록 만들었다 (`--owner-name`/`--contact-email` 플러그
추가, 대화형 모드에서는 게시판 추가 여부를 반복해서 물어봄). `docs/fork-checklist.md`
6번 섹션과 `tools/fork-setup/README.md`도 함께 갱신됨. 이 가이드의 2·4단계는
이미 새 동작을 반영해서 고쳐놓았다.
