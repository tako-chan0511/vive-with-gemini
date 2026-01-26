# WSL2 ネットワーク完全ガイド
目的：**NAT（旧）→ Mirrored Mode（新）** へ移行し、VPN/DNS/セキュリティ/外部アクセス/Dockerまで含めた「実務で困らない」状態にする。

---

## １ NATからMirroredへ：全体像

![N1.WSL2ネットワーク完全ガイド](/images/network/N1.WSL2ネットワーク完全ガイド.jpg)

### 図の要旨
- WSL2のネットワークは **従来のNAT** から、**Mirrored Mode（推奨）** へ移行しつつある。
- Mirroredは「WindowsホストとLinux(WSL)のネットワーク境界を薄くして、開発体験を最適化」する方向。

### 詳細解説（用語を含む）
- **NAT（Network Address Translation）**：
  - WSL2が仮想スイッチの内側（隔離ネットワーク）にいて、外に出る時にアドレス変換される構成。
  - 外部→WSL2への到達は、**ポートフォワード/portproxy** 等の追加設定が必要になりがち。
- **Mirrored Mode**：
  - 図の「Unified IP Stack / Shared IP Address Space」という方向性の通り、WSL2がWindowsホストのネットワークに“寄る”構成。
  - **localhostの相互到達**、**LANからの到達**、**VPNとの相性**などが改善しやすい。

### Tips（実務）
- 迷ったら最初に決める観点はこれです：
  - 「自分だけ使う」より「LAN/他端末からアクセスしたい」「VPN環境でも安定させたい」なら **Mirrored** が有利。
  - ただしMirroredは “つながりやすい＝露出が増える” ので、後半の **Firewall/UFW設計**が重要。

---

## ２ トラブルシューティングの5レイヤ（全体設計）

![N2.ネットワークレイヤ５について](/images/network/N2.ネットワークレイヤ５について.jpg)

### 図の要旨
- WSL2ネットワークの問題は「どの層で壊れているか」を切り分けると速い。
- 特に注意：**WSL2は全て“仮想化（Layer4）”の影響下**にあるため、Windows側理解が不可欠。

### 詳細解説（用語を含む）
- **Layer1（物理/基本）**：NIC/インターフェース、IP割当（`ip addr`）
- **Layer2（ルーティング）**：GW/経路、疎通（`ping`, `traceroute`）
- **Layer3（セキュリティ）**：パケットフィルタ（Windows FW / UFW / SSH）
- **Layer4（仮想化）**：WSL2そのもの（Hyper-V/WSLのネットワーク方式）
- **Layer5（トラブル対応）**：原因調査のロジカルフロー（順番の型）

### Tips（実務）
- “最短で直す”コツ：**上から順に確認**ではなく、まず **Layer4（方式）** を疑う。
  - NATとMirroredで挙動が大きく変わるため、方式が合っていないと下位層をいくら触っても直りません。

---

## ３ NAT vs Mirrored：違いを一枚で把握

![N3.アーキテクチャの進化：NATvsMirroredMode](/images/network/N3.アーキテクチャの進化：NATvsMirroredMode.jpg)

### 図の要旨
- NAT（旧）：隔離、WSLはプライベートIP、外部アクセスに工夫が必要、VPNで問題が出やすい
- Mirrored（推奨）：物理IFミラー、ホストIP帯を共有、IPv6/マルチキャスト対応、LANへシームレス

### 詳細解説（用語を含む）
- **プライベートIP(172.x)**：NAT配下でWSLが独自IPを持つ典型。Windowsホストとは別ネット扱いになりやすい。
- **ホストIP(192.168.x)**：家庭/社内LANで一般的。Mirroredではこの帯域に寄るため、他端末から見た“到達性”が上がる。
- **IPv6 / マルチキャスト**：
  - 開発で直接意識しなくても、VPN/名前解決/一部ツールで差が出ることがある。

### Tips（実務）
- 「LANからスマホでWSLのWebを見たい」「同一LANの別PCから叩きたい」はMirroredが圧倒的に簡単になります（後述：Layer4の外部アクセス）。

---

## ４ グローバル設定：`.wslconfig`（Windows側）

![N4.グローバル設定：.wslconfigの構成](/images/network/N4.グローバル設定：.wslconfigの構成.jpg)

### 図の要旨
- 設定ファイル：`%UserProfile%\.wslconfig`（WSL2全体に適用）
- 例：
  - `networkingMode=mirrored`
  - `dnsTunneling=true`
  - `autoProxy=true`
  - `firewall=true`
- Windows 11 22H2+ 前提の新アーキテクチャ。

### 詳細解説（用語を含む）
- **networkingMode=mirrored**：WSL2のネットワーク方式をMirroredへ。
- **dnsTunneling=true**：
  - Linux側のDNS問い合わせを“仮想化チャネル”経由でWindows側に寄せ、VPN等のフィルタ影響を受けにくくする発想（後述）。
- **autoProxy=true**：
  - Windowsのプロキシ設定をWSLへ反映しやすくする。
- **firewall=true**：
  - Mirroredでは露出が増えるため、Windows側FW適用（Hyper-V FW含む）を前提にする。

### Tips（実務）
- “まずこれだけ”の最小セット（推奨）：
  - `networkingMode=mirrored`
  - `dnsTunneling=true`
  - `firewall=true`
- プロキシ配下（会社ネットワーク）では `autoProxy=true` が効くことが多いです。

---

## ５ ローカル設定：`/etc/wsl.conf`（Linux側）

![N5.ローカル設定：wsl.confの調整](/images/network/N5.ローカル設定：wsl.confの調整.jpg)

### 図の要旨
- 各ディストリビューション内の設定：`/etc/wsl.conf`
- 例：
  - `[boot] systemd=true`
  - `[network] generateResolvConf=true`
  - `hostname=...`
- DNSトンネリング利用時は `generateResolvConf` の扱いに注意。

### 詳細解説（用語を含む）
- **systemd=true**：
  - Linuxの標準的なサービス管理基盤。Docker/一部ツール/常駐系の安定に寄与することが多い。
- **/etc/resolv.conf**：
  - LinuxのDNS参照先。WSLは自動生成する場合がある。
- **generateResolvConf=true**：
  - WSL側でresolv.confを自動生成する設定。dnsTunnelingと組み合わせる時の推奨は環境で差が出るため、図の注意書き通り“まずはtrueで様子を見る”が安全。

### Tips（実務）
- DNSが不安定なときは、次の順で確認：
  1) `.wslconfig` の `dnsTunneling=true`
  2) `/etc/wsl.conf` の `generateResolvConf=true`
  3) それでもダメなら `/etc/resolv.conf` の中身を確認（意図しないDNSが入っていないか）

---

## ６ 設定適用の「8秒ルール」

![N6.設定の適用と「８秒ルール」](/images/network/N6.設定の適用と「８秒ルール」.jpg)

### 図の要旨
- 設定反映手順：
  1) 設定編集（.wslconfig / wsl.conf）
  2) `wsl --shutdown`
  3) **8秒待機**（完全停止待ち）
  4) 再起動（ディストリ起動）
- さらに `wsl --update` と WSLバージョン 2.0.0+ を確認。

### 詳細解説（用語を含む）
- WSL2は軽量VMとして動作するため、停止直後に即起動すると “古い状態が残る” ことがあります。
- **8秒**は「完全停止までの猶予」を明示的に確保する運用ルール。

### Tips（実務）
- 反映されない問題の大半はここで解決します：
  - 「編集したのに変わらない」→ `wsl --shutdown` → 8秒 → 再起動
- バージョン確認：
  - `wsl --version`
  - `wsl --update`

---

## ７ Layer1：インターフェースとIP確認（NATとMirroredの差が出る）

![N7.Layer1：インターフェースとIPの確認](/images/network/N7.Layer1：インターフェースとIPの確認.jpg)

### 図の要旨
- NAT：`172.28.x.x` など “仮想的なプライベートIP”
- Mirrored：`192.168.1.5/24` など “Windowsホストと同一帯域”
- Mirroredでは **localhost(127.0.0.1) が双方向に透過的**に機能しやすい。

### 詳細解説（用語を含む）
- `ip addr` で見るべきは：
  - `eth0` の `inet`（IPv4アドレス）
  - `/24` はネットマスク（同一LAN範囲）を表す
- NATだと「WSL→外」は出られるが「外→WSL」が面倒になりやすいのは、IP空間が分断されているため。

### Tips（実務）
- まず“方式確認”としてこれを固定化すると良いです：
  - `ip addr`（Linux）
  - `ipconfig`（Windows）
  - 両方が同一帯域（例：192.168.x）で整合しているか（Mirrored判定の近道）

---

## ８ Layer2：DNSトンネリングとVPN問題の解決

![N8.Layer2：DNSトンネリングとVPN問題の解決](/images/network/N8.Layer2：DNSトンネリングとVPN問題の解決.jpg)

### 図の要旨
- `dnsTunneling=false`：VPNのフィルタでLinux側DNSが落ちる（Timeout/Blocked）
- `dnsTunneling=true`：仮想化チャネル経由でWindows DNS Resolverへ → 成功しやすい

### 詳細解説（用語を含む）
- **VPN Packet Filter**：
  - 会社VPN等で、特定経路のDNS/UDPが落とされることがある。
  - NAT構成のWSLは “別ネットワーク” として扱われてフィルタ対象になるケースがある。
- **Windows DNS Resolver**：
  - Windows側はVPN前提で正しいDNS設定に切り替わることが多い。
  - そこで「WSLのDNS問い合わせをWindowsへトンネルする」のが dnsTunneling の狙い。

### Tips（実務）
- DNS切り分けの最短セット：
  - `ping 8.8.8.8`（IP疎通）
  - `ping google.com`（DNS）
  - IPはOKで名前解決だけNGなら、dnsTunneling/resolve.conf が本命。

---

## ９ Layer3（Windows側）：Hyper-Vファイアウォール（Mirrored時は特に重要）

![N9.Layer3：Hyper-Vファイアウォール](/images/network/N9.Layer3：Hyper-Vファイアウォール.jpg)

### 図の要旨
- Mirrored Modeでは **Windowsファイアウォールが適用**される前提。
- 例：PowerShellで `New-NetFirewallHyperVRule` を作り、必要ポートだけ許可する。
- 「Allow Allは避け、ホワイトリスト方式を推奨」。

### 詳細解説（用語を含む）
- **Hyper-V Firewall**：
  - WSL2がHyper-V基盤の上にいるため、仮想化レイヤのFW制御が関与する。
- **VMCreatorId**：
  - WSL2の仮想マシン識別子。ルールを“WSL宛て”に絞るために使う発想。
- **最小権限（Least Privilege）**：
  - 必要ポートだけ開ける。MirroredはLANからも見えやすくなるため、ここが疎いと危険。

### Tips（実務）
- まずは「開けるポート」を棚卸し：
  - Web開発：`3000/5173/8080` 等
  - SSH：`22`
  - DB：`5432`（開けるなら理由が必要。基本は閉じる）
- “開通確認”は Windows側から `Test-NetConnection`（後述）をセットで。

---

## １０ Linux側のセキュリティ：UFWとSSH（二重防御）

![N10.Linux側のセキュリティ：UFWとSSH](/images/network/N10.Linux側のセキュリティ：UFWとSSH.jpg)

### 図の要旨
- トラフィックは **Windows Hyper-V Firewall → Linux Kernel/UFW → アプリ** の順で通る。
- SSH公開などは **Windows側/WSL側の両方**で許可が必要になり得る。

### 詳細解説（用語を含む）
- **UFW（Uncomplicated Firewall）**：
  - Linux側の簡易FW。iptables/nftablesのラッパ。
- **SSH**：
  - リモートログイン。LANに出す場合は “鍵/ポート/許可範囲” を意識しないと危険。

### Tips（実務）
- SSHを“必要最小限で安全に”使う方針（例）：
  - LAN限定で許可（可能なら）
  - パスワードログイン禁止（鍵のみ）
  - `ufw allow 22/tcp` の前に、Windows側FWでも同等に制御

---

## １１ Layer4：LANからの外部アクセス（NATの面倒が消える）

![N11.Layer4：LANからの外部アクセス](/images/network/N11.Layer4：LANからの外部アクセス.jpg)

### 図の要旨
- NAT（Legacy）：外部アクセスに `netsh interface portproxy` 等が必要になりがち
- Mirrored（Modern）：追加設定なしで **WindowsホストIPで直接アクセス**できる構図
- MirroredはWSL2をLAN内の“物理サーバ”のように振る舞わせられる

### 詳細解説（用語を含む）
- **portproxy（Windows）**：
  - Windowsでポート転送を作る仕組み。NAT構成で「外→WSL」に必要になる典型手段。
- **0.0.0.0:3000**：
  - アプリが全IFで待ち受ける設定。LAN到達性を上げるが、露出も上がる（FW設計が必須）。

### Tips（実務）
- “LAN公開したい”場合の最小チェック：
  1) アプリが `0.0.0.0:<port>` でlistenしているか
  2) Windows Hyper-V FWで `<port>` を許可しているか
  3) Linux側UFWでも必要なら許可しているか
  4) 別端末（スマホ）から `http://<WindowsホストIP>:<port>` で到達するか

---

## １２ Layer5：MTU問題（VPNで「pingは通るのに大容量が死ぬ」）

![N12.Layer5：MTU問題の特定と解決](/images/network/N12.Layer5：MTU問題の特定と解決.jpg)

### 図の要旨
- 症状：
  - `ping` は通るのに `git clone` や大きいDLがフリーズ
  - VPN接続時に起きやすい
- 原因：
  - WSL既定MTU 1500 vs VPNカプセル化MTU 1350 → 断片化/損失
- 対策：
  - 一時：`ip link set dev eth0 mtu 1350`
  - 恒久：`/etc/wsl.conf` の boot command で固定

### 詳細解説（用語を含む）
- **MTU（Maximum Transmission Unit）**：
  - 1パケットの最大サイズ。大きすぎるとVPNの上で分断・破棄が起きる。
- **pingが通る理由**：
  - pingは小さいパケットでも成立するため、MTU不整合が露呈しないことがある。

### Tips（実務）
- “MTU疑い”の判断基準：
  - 小さい通信はOK、大きい転送だけ不安定（特にVPN時）
- 恒久対応するなら、値は環境により変動し得るため、まずは一時設定で再現が消えるか確認してから固定。

---

## １３ トラブルシューティングのロジカルフロー（手順の型）

![N13.トラブルシューティングのフロー](/images/network/N13.トラブルシューティングのフロー.jpg)

### 図の要旨
- 迷ったらこの順：
  1) WSL起動確認（`wsl --status`）
  2) IP/DNS（`ping 8.8.8.8` / `ping google.com`）
  3) 経路（`ip route` / `traceroute`）
  4) ポート（`ss -tulpn` / `Test-NetConnection`）
- “三種の神器”：`ping`, `traceroute`, `mtr`

### 詳細解説（用語を含む）
- **ss -tulpn**：
  - Linuxで待受ポートとプロセスを確認（netstat代替）。
- **Test-NetConnection**：
  - Windows PowerShellで疎通とポート確認。
- **mtr**：
  - ping＋tracerouteの統合ツール。経路上の遅延/損失を見やすい。

### Tips（実務）
- 最短で「原因層」を確定するコツ：
  - DNSか？（名前解決）
  - ルーティングか？（経路）
  - FWか？（ポート）
  - 方式か？（NAT/Mirrored）
- “やってはいけない”のは、症状だけ見てFWを全開放すること（原因が見えなくなる上に危険）。

---

## １４ Docker Desktopとの統合（Mirrored時のポート衝突対策）

![N14.DockerDesktopとの統合](/images/network/N14.DockerDesktopとの統合.jpg)

### 図の要旨
- Docker Desktop v4.26+ は Mirrored Mode をサポート
- コンテナポートは localhost に自動マッピングされやすい
- ポート競合時は `.wslconfig` の `ignoredPorts` で“Linux専用ポート”を確保する

### 詳細解説（用語を含む）
- **ignoredPorts**：
  - Windows側の自動ポート連携（予約）と競合する場合に、特定ポートを“WSL側に確保”する意図。
- Mirroredは便利ですが、ホストとWSLとコンテナが同じ“港（ポート）”を取り合いやすくなるため、運用上の整理が必要です。

### Tips（実務）
- 競合の典型：
  - Windowsアプリが 3000 を使用、WSLのNodeも 3000 を使いたい、Dockerも…という状態
- 対処の基本線：
  - “よく使うポート”をチームで決め、衝突しない設計に寄せる
  - どうしても必要なら `ignoredPorts=3000,8080` のように明示確保

---

## １５ まとめ：現代的なWSL2ネットワーク環境

![N15.まとめ：現代的なWSL２ネットワーク環境](/images/network/N15.まとめ：現代的なWSL２ネットワーク環境.jpg)

### 図の要旨
- Architecture：Mirrored Modeへ移行
- Connectivity：DNS Tunnelingを有効化
- Configuration：.wslconfigで一元管理
- Security：Hyper-Vファイアウォールで制御
- レガシーNAT＋スクリプト運用から卒業し、シンプルで強い開発環境へ

### 詳細解説（用語を含む）
- この資料のゴールは「繋がる/繋がらない」を場当たりで直すのではなく、
  - **方式（Mirrored）**
  - **名前解決（dnsTunneling）**
  - **設定運用（.wslconfig / wsl.conf / 8秒ルール）**
  - **防御（Windows FW + UFW）**
  をセットで設計し、再現性のある状態にすることです。

### Tips（実務）
- “現場で効く”最小の完成形（推奨）：
  1) `.wslconfig`：mirrored / dnsTunneling / firewall
  2) `wsl --shutdown`（8秒ルール）
  3) Layer1〜5の確認コマンドを手順化（ページ13のフロー）
  4) LAN公開するなら FW/UFW を必ず設計（ページ9〜11）
