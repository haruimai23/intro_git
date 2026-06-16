import os
import json
import re
import secrets
import time
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timedelta
from fastmcp import FastMCP

mcp = FastMCP("mcp-dr2")


def _get_session() -> dict | None:
    """現在のプロセスに紐づく有効なセッション情報を取得します。"""
    process_id = os.getpid()
    state_dir = os.path.join(os.path.dirname(__file__), "state")
    session_file = os.path.join(state_dir, f"session_{process_id}.json")

    if not os.path.exists(session_file):
        return None

    with open(session_file, "r", encoding="utf-8") as f:
        session_data = json.load(f)

    if time.time() > session_data["expires_at"]:
        try:
            os.remove(session_file)
        except OSError:
            pass
        return None

    return session_data


@mcp.tool()
def get_mcp_dr_user_by_email(email: str) -> str:
    """mcp-dr2システムで指定したメールアドレスのユーザー情報を取得します。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    session = _get_session()

    if session is None:
        return (
            "❌ エラー: ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    phpsessid = session.get("phpsessid")
    if not phpsessid:
        return (
            "❌ エラー: PHPSESSIDが見つかりません\n\n"
            "💡 再度ログインしてください"
        )

    login_info = f"🔐 ログイン中: {session['email']}\n\n"

    api_url = (
        "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/test2.php?"
        + urllib.parse.urlencode({"mail_addr": email})
    )

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            headers={
                "Accept": "text/html,application/json",
                "Cookie": f"PHPSESSID={phpsessid}",
            },
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            response = res.read().decode("utf-8")

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = None

        if isinstance(data, dict) and data.get("status") is False:
            return (
                "エラー: "
                + str(data.get("message", "ユーザーが見つかりませんでした"))
                + f"\n(メールアドレス: {email})"
            )

        if isinstance(data, list):
            permission_map = {"1": "admin", "2": "operator", "3": "limit"}

            for user_array in data:
                if not isinstance(user_array, list):
                    continue
                for field in user_array:
                    if not isinstance(field, dict):
                        continue
                    if field.get("type") == "PERMISSION_INFO" and isinstance(field.get("value"), str):
                        permissions = [p.strip() for p in field["value"].split(",")]
                        converted = [permission_map.get(p, p) for p in permissions if p]
                        field["value"] = ",".join(converted)

            response = json.dumps(data, ensure_ascii=False)

        return login_info + "APIからの回答: " + response

    except Exception as e:
        return f"エラー: {e}"


@mcp.tool()
def get_mcp_dr_users() -> str:
    """mcp-dr2システムからユーザー一覧を取得します。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    session = _get_session()

    if session is None:
        return (
            "❌ エラー: ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    phpsessid = session.get("phpsessid")
    if not phpsessid:
        return (
            "❌ エラー: PHPSESSIDが見つかりません\n\n"
            "💡 再度ログインしてください"
        )

    login_info = f"🔐 ログイン中: {session['email']}\n\n"

    api_url = "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/getUsers.php"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            headers={
                "Accept": "text/html,application/json",
                "Cookie": f"PHPSESSID={phpsessid}",
            },
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            response = res.read().decode("utf-8")

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = None

        if isinstance(data, list):
            permission_map = {"1": "admin", "2": "operator", "3": "limit"}

            for user_array in data:
                if not isinstance(user_array, list):
                    continue
                for field in user_array:
                    if not isinstance(field, dict):
                        continue
                    if field.get("type") == "PERMISSION_INFO" and isinstance(field.get("value"), str):
                        permissions = [p.strip() for p in field["value"].split(",")]
                        converted = [permission_map.get(p, p) for p in permissions if p]
                        field["value"] = ",".join(converted)

            response = json.dumps(data, ensure_ascii=False)

        return login_info + "APIからの回答: " + response

    except Exception as e:
        return f"エラー: {e}"


@mcp.tool()
def login_mcp_dr(email: str, password: str) -> str:
    """mcp-dr2システムにログインします。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    api_url = (
        "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/login.php?"
        + urllib.parse.urlencode({"email": email, "password": password})
    )

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            headers={"Accept": "text/html"},
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            body = res.read().decode("utf-8").strip()
            set_cookie = res.headers.get("Set-Cookie", "")

        phpsessid = ""
        for part in set_cookie.split(";"):
            part = part.strip()
            if part.startswith("PHPSESSID="):
                phpsessid = part[len("PHPSESSID="):]
                break

    except Exception:
        return (
            "❌ エラー: APIからの応答がありませんでした\n\n"
            "💡 ネットワーク接続を確認してください"
        )

    if body == "cfNG":
        return (
            "❌ ログイン失敗\n\n"
            "メールアドレス又はパスワードが違います。\n\n"
            "💡 入力内容を確認して再度お試しください"
        )

    token = secrets.token_hex(32)
    now = datetime.now()
    expires_dt = now + timedelta(hours=1)
    process_id = os.getpid()

    state_dir = os.path.join(os.path.dirname(__file__), "state")
    os.makedirs(state_dir, exist_ok=True)

    session_data = {
        "phpsessid": phpsessid,
        "token": token,
        "email": email,
        "process_id": process_id,
        "exp_dt": expires_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "expires_at": int(expires_dt.timestamp()),
    }

    session_file = os.path.join(state_dir, f"session_{process_id}.json")
    with open(session_file, "w", encoding="utf-8") as f:
        json.dump(session_data, f, ensure_ascii=False, indent=4)

    message = (
        "✅ ログイン成功\n\n"
        f"ユーザー: {email}\n"
        f"プロセスID: {process_id}\n"
        f"セッションファイル: session_{process_id}.json\n"
        f"セッション有効期限: {expires_dt.strftime('%Y-%m-%d %H:%M:%S')} (1時間有効)\n"
    )

    if phpsessid:
        message += f"PHPSESSID: {phpsessid}\n"

    message += "\n"

    if body == "cfOK_pwNG":
        message += (
            "⚠️ パスワードの有効期限が切れています。\n"
            "💡 パスワードの変更をお勧めします。\n\n"
        )
    elif body == "cfOK_pwOK2":
        message += "✅ ユーザー管理権限でログインしました。\n\n"
    elif body == "cfOK_pwOK":
        message += "✅ 通常権限でログインしました。\n\n"

    message += "💡 以降のAPI呼び出しでは自動的にこのセッションが使用されます。"

    return message


@mcp.tool()
def check_login_status_mcp_dr() -> str:
    """mcp-dr2システムの現在のログイン状態を確認します。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    process_id = os.getpid()
    state_dir = os.path.join(os.path.dirname(__file__), "state")
    session_file = os.path.join(state_dir, f"session_{process_id}.json")

    if not os.path.exists(session_file):
        return (
            "❌ ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    with open(session_file, "r", encoding="utf-8") as f:
        session_data = json.load(f)

    if time.time() > session_data["expires_at"]:
        try:
            os.remove(session_file)
        except OSError:
            pass
        return (
            f"❌ セッションの有効期限が切れています（期限: {session_data['exp_dt']}）\n\n"
            "💡 再度ログインしてください"
        )

    remaining_minutes = int((session_data["expires_at"] - time.time()) // 60)

    return (
        "✅ ログイン中\n\n"
        f"ユーザー: {session_data['email']}\n"
        f"ログイン日時: {session_data['created_at']}\n"
        f"有効期限: {session_data['exp_dt']}\n"
        f"残り時間: 約{remaining_minutes}分"
    )


@mcp.tool()
def logout_mcp_dr() -> str:
    """mcp-dr2システムからログアウトしてセッションを削除します。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    process_id = os.getpid()
    state_dir = os.path.join(os.path.dirname(__file__), "state")
    session_file = os.path.join(state_dir, f"session_{process_id}.json")

    if not os.path.exists(session_file):
        return "既にログアウトしています"

    with open(session_file, "r", encoding="utf-8") as f:
        session_data = json.load(f)
    email = session_data.get("email", "不明")

    try:
        os.remove(session_file)
    except OSError:
        pass

    return f"✅ ログアウト完了\n\nユーザー: {email}"


@mcp.tool()
def update_mcp_dr_user_permission(email: str, permission_info: str) -> str:
    """mcp-dr2システムで指定したメールアドレスのユーザーの権限情報を更新します。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。権限admin:基本機能(データ閲覧・基本操作)、権限operator:ユーザ管理(追加・編集・削除)、権限limit:制御禁止(システム設定変更)。複数指定可(例:admin,operator)。入力値がadmin,operator,limit以外の場合はエラーを返して実行を中断します。"""

    session = _get_session()

    if session is None:
        return (
            "❌ エラー: ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    login_info = f"🔐 ログイン中: {session['email']}\n\n"

    phpsessid = session.get("phpsessid")
    if not phpsessid:
        return (
            "❌ エラー: PHPSESSIDが見つかりません\n\n"
            "💡 再度ログインしてください"
        )

    valid_values = {"admin", "operator", "limit"}
    permissions = [p.strip() for p in permission_info.split(",")]
    for p in permissions:
        if p not in valid_values:
            return login_info + f"エラー: 無効な権限コード '{p}' が含まれています。admin, operator, limit の中から選んでください。"

    permission_map = {"admin": "1", "operator": "2", "limit": "3"}
    permission_info_numeric = ",".join(permission_map[p] for p in permissions)

    api_url = "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/test3.php"
    post_data = urllib.parse.urlencode(
        {"email": email, "permission_info": permission_info_numeric}
    ).encode("utf-8")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            data=post_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": f"PHPSESSID={phpsessid}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            response = res.read().decode("utf-8")

        return login_info + "APIからの回答: " + response

    except Exception as e:
        return f"エラー: {e}"


@mcp.tool()
def delete_mcp_dr_user(email: str, confirm: bool = False) -> str:
    """mcp-dr2システムでユーザーを削除します。実行前に必ずユーザー詳細確認(get_mcp_dr_user_by_email)を行います。mcp-drシステムとは別のツールです。tepco-dr-systemとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    session = _get_session()

    if session is None:
        return (
            "❌ エラー: ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    login_info = f"🔐 ログイン中: {session['email']}\n\n"

    phpsessid = session.get("phpsessid")
    if not phpsessid:
        return (
            "❌ エラー: PHPSESSIDが見つかりません\n\n"
            "💡 再度ログインしてください"
        )

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return f"エラー: '{email}' は有効なメールアドレス形式ではありません。"

    if not confirm:
        return (
            login_info
            + f"メールアドレス: {email} のユーザーを削除しようとしています。"
            + "本当に削除してよろしいですか？（この操作は取り消せません）"
        )

    api_url = "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/delUser_mcp.php"
    post_data = urllib.parse.urlencode({"email": email}).encode("utf-8")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            data=post_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": f"PHPSESSID={phpsessid}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            response = res.read().decode("utf-8").strip()

        if response == "userDelNG1":
            return f"エラー: データベース接続に失敗しました（{email}）"
        elif response == "userDelNG2":
            return f"エラー: メールアドレスの形式が正しくありません（{email}）"
        elif response == "userDelNG3":
            return f"エラー: ユーザーの削除に失敗しました（{email}）"

        return (
            login_info
            + "✅ ユーザー削除完了\n\n"
            + "削除されたユーザー:\n"
            + f"- メールアドレス: {email}\n\n"
            + "💡 推奨される次のアクション:\n"
            + "1. 削除を確認:\n"
            + "   → 「mcp-dr2システムでユーザー一覧を取得して」\n"
            + "2. 削除されたことを確認:\n"
            + f"   → 「mcp-dr2システムでメールアドレス {email} のユーザー情報を取得して」\n"
            + "   （エラーが返されれば削除成功）\n\n"
            + f"APIレスポンス: {response}"
        )

    except Exception as e:
        return f"エラー: {e}"


@mcp.tool()
def add_mcp_dr_user(email: str) -> str:
    """mcp-dr2システムでユーザーを登録します。tepco-dr-systemとは別のツールです。mcp-drシステムとは別のツールです。mcp-testdrシステムとは別のツールです。api-bridgeとは別のツールです。"""

    session = _get_session()

    if session is None:
        return (
            "❌ エラー: ログインしていません\n\n"
            "💡 「login」ツールを使用してログインしてください"
        )

    login_info = f"🔐 ログイン中: {session['email']}\n\n"

    phpsessid = session.get("phpsessid")
    if not phpsessid:
        return (
            "❌ エラー: PHPSESSIDが見つかりません\n\n"
            "💡 再度ログインしてください"
        )

    api_url = "https://tepco-dr-simple-driving.bitmedia.ne.jp/cloud_dev_imai/html/api/addUser_mcp.php"
    post_data = urllib.parse.urlencode({"email": email}).encode("utf-8")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            api_url,
            data=post_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": f"PHPSESSID={phpsessid}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            response = res.read().decode("utf-8")

        return login_info + "APIからの回答: " + response

    except Exception as e:
        return login_info + f"エラー: {e}"


if __name__ == "__main__":
    mcp.run()
