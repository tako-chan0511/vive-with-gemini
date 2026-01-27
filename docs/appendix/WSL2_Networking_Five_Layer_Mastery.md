## １ WSL2ネットワークを「5レイヤー」で理解する（全体像）

![NN1.初心者のためのWSL２ネットワーク：NATアーキテクチャの完全理解](/images/network/NN1.初心者のためのWSL２ネットワーク：NATアーキテクチャの完全理解.jpg)

### 図の要旨
WSL2のネットワーク学習を、**Layer1〜5**の順に理解・診断するための入口。

### 詳細解説

- 通信問題は「どこで詰まっているか」を層（レイヤー）で切り分けるのが最短です。
- 本資料のレイヤー定義（実務寄りの“診断用”）  
  - **Layer1：IF・IP**（インターフェースは生きてる？IPは付いてる？）  
  - **Layer2：ルーティング**（ゲートウェイは？どこへ出ていく？）  
  - **Layer2.5：名前解決（DNS）**（IP直打ちはOKでドメインがNG？）  
  - **Layer3：Firewall/フィルタ**（Windows側・Linux側の二重）  
  - **Layer4/5：NAT・外部公開**（外から見えない、の正体）
- WSL2は「LinuxがWindowsの中で動いている」ように見えますが、ネットワーク的には **小さな仮想マシン（VM）** として動作します。(Windows11におけるHyper-VはWSL2にとっての「基盤となるエンジン」かつ「ネットワークの門番」という位置づけ)
  - Hyper-Vについて:WSL２用途だけなら、たいてい必須ではない、軽量のVM基盤（VirtualMachinePlatform）は動作している。本格的にHyper-VマネージャでWindowsVMを作って運用する必要がある場合は、Hyper-V機能チェックボックスをONにする必要があります。

### Tips（この順で見れば迷子になりにくい）
- Layer１から順に調査していけば、「何が正常で、何が異常か」を具体的に言語化できるので、調査が確実になります。

---

## ２ WSL2のNAT構成とは：なぜ“外から見えない”のか

![NN2.全体像：Windowsの中にある「別の家」](/images/network/NN2.全体像：Windowsの中にある「別の家」.jpg)

### 図の要旨
WSL2は **NAT配下のプライベート空間**。外部へは出られるが、外部からは直接入りにくい。

### 詳細解説
- **NAT（Network Address Translation）**：内側のIPを、外側へ出るときに別のIP/ポートへ変換する仕組み。
- WSL2（NATモード）は典型的にこうなります：
  - WSL2：プライベートIP（例：172.17.x.x）
    - 192.168はLAN用途（物理）で172はWSL2仮想ネットワーク用途（PC内部）となる。
  - Windows：WSL用の仮想スイッチ＆NATを持つ
  - 外部（LAN/Internet）から見ると、WSL2のIPは“内側”なので直接届かない
- 重要な直感：
  - **内→外**：NATが“変換表”を作れるので通りやすい  
  - **外→内**：変換表がないと「誰宛？」が分からず落ちやすい（→ポート転送が必要）

### Tips（“見えない”を前提に設計する）
- WSL上のWebサーバをスマホから見たい、などは **NATの壁**に当たります。  
  解決策は後半（ポートプロキシ／Mirrored Mode）で整理します。

---

## ３ 学習ロードマップ：5レイヤーで順に理解・診断する

![NN3.学習ロードマップ：５つのレイヤー](/images/network/NN3.学習ロードマップ：５つのレイヤー.jpg)

### 図の要旨
理解もトラブルシュートも、**Layer1→2→2.5→3→4/5**の順で進める。

### 詳細解説
- 典型症状と対応レイヤー：
  - `ping 8.8.8.8`**（ Google Public DNS のIPアドレス）** がNG → Layer2（経路）〜Layer3（フィルタ）
  - `ping 8.8.8.8` OK だが `ping google.com` NG → Layer2.5（DNS）
  - WSL→外はOKだが 外→WSLがNG → Layer4/5（NAT/公開）
- なぜこの順が良いか：
  - 上位（DNSや公開）を疑っても、下位（IPや経路）が壊れていると必ず詰まるため。

### Tips（“次の一手”が自動で決まるチェック表）
- **IPがある？** → **GWがある？** → **IPへpingできる？** → **DNSできる？** → **Firewall？** → **外部公開？**  
  という“一本道”にしておくと、迷いません。

---

## ４ Layer1：インターフェースとIP（まずは自分の住所）

![NN4.Layer1：アイデンティティの確認](/images/network/NN4.Layer1：アイデンティティの確認.jpg)

### 図の要旨
`ip -4 addr show eth0` で、WSLの主IF（eth0）とIPv4を確認する。

### 詳細解説
- 用語整理：
  - **インターフェース（IF）**：ネットワークの“口”（例：eth0）
  - **IPアドレス**：ネットワーク上の“住所”
  - **CIDR（/20など）**：ネットマスク（同一ネットワークの範囲）
- まず見るべきポイント：
  - `state UP`：IFが上がっている
  - `inet 172.17.xxx.xxx/20`：IPv4が付いている
- ここがNGだと：
  - ルーティング以前に通信が成立しない（レイヤー1で停止）

### Tips（最低限の観測コマンド）
```bash
ip -4 addr show eth0
ip link show eth0
````

* “eth0が無い”場合：WSL側が壊れているというより、WSL自体の起動・ネット初期化問題の可能性が上がります。

---

## ５ Layer2：ルーティング（出口＝ゲートウェイを確認）

![NN5.Layer2：出口（ゲートウェイ）の特定](/images/network/NN5.Layer2：出口（ゲートウェイ）の特定.jpg)

### 図の要旨

`ip route` で、デフォルトゲートウェイ（default via …）を確認する。

### 詳細解説

* 用語整理：

  * **ルート（route）**：宛先ネットワークへどう送るかの表
  * **デフォルトゲートウェイ**：それ以外全部を“とりあえず出す”出口
* NATモードの典型：

  * `default via 172.17.160.1 dev eth0` のように、**Windows側の仮想IF**が出口になる
* 重要な理解：

  * WSL→外部は「eth0 → ゲートウェイ → Windows NAT → 外部」の順

### Tips（出口が無い/おかしい時）

```bash
ip route
ip neigh   # ARP相当（近隣の解決状況）
```

* `default via` が無い場合：外へ出られません。WSL再起動（Windows側からの `wsl --shutdown`）が効くケースがあります。

---

## ６ Layer2.5：DNS（名前解決）とVPN“壁”

![NN6.Layer2.5：地図（DNS）とVPNの壁](/images/network/NN6.Layer2.5：地図（DNS）とVPNの壁.jpg)

### 図の要旨

`/etc/resolv.conf` の `nameserver` を確認し、VPN環境でのDNS詰まりを理解する。

### 詳細解説

* 用語整理：

  * **DNS**：`google.com` のような名前→IPへ変換する仕組み
  * **nameserver**：DNS問い合わせ先
* 症状の切り分け（超重要）：

  * `ping 8.8.8.8` OK だが `ping google.com` NG → DNS問題が濃厚
* VPNで起きがちな理由：

  * Windows側は社内DNSへ行けているが、WSLのDNS経路がVPNのフィルタで落ちる、など

### Tips（最短の診断手順）

```bash
cat /etc/resolv.conf
ping -c 1 8.8.8.8
ping -c 1 google.com
getent hosts google.com
```

* 解決アプローチ例（方針だけ）：

  * WSLのDNSをWindows側へ“トンネル”する設定（`.wslconfig` の `dnsTunneling` 等）を検討する
    ※ここは環境差が大きいので「まず観測→症状一致なら設定」が安全です。

---

## ７ Layer3：Firewallは二重（Windows側＋Linux側）

![NN7.Layer3：二重の防御壁](/images/network/NN7.Layer3：二重の防御壁.jpg)

### 図の要旨

通信は **Windows側のフィルタ** と **Linux側（ufw等）** の二重チェックを通る。

### 詳細解説

* 初学者が混乱しやすい点：

  * WSL内で `ufw allow 3000` しても、Windows側で落ちていたら届きません。
* “外からWSLへ繋がらない”の典型原因：

  * Windows Defender Firewall / Hyper-V関連のルール
  * Linux側でポートが閉じている
  * そもそもNATで届かない（Layer4/5）

### Tips（まずLinux側の待受を確認）

```bash
# そのポートで待ち受けているか（例：3000）
ss -lntp | grep 3000

# ufwを使っている場合
sudo ufw status verbose
```

* “待受していない”ならFirewall以前の問題です（アプリが起動していない、bindが127.0.0.1限定、など）。

---

## ８ Layer4：NATの現実（内→外はOK、外→内はNGになりやすい）

![NN8.Layer4：NATの現実](/images/network/NN8.Layer4：NATの現実.jpg)

### 図の要旨

NATは **内→外の通信を得意**とする一方、**外→内は仕掛けが必要**。

### 詳細解説

* NATは、内側から外へ出た通信について「戻り先」を覚えます（変換表）。
* 外から突然来た通信は、変換表が無いので：

  * どの内側ホスト（WSL）へ渡すか不明
  * 結果として到達しない（= “外から見えない”）

### Tips（“公開”という言葉を分解する）

* 外からWSLへ入れるようにする＝

  1. Windowsが受ける（listen）
  2. 受けたものをWSLへ転送する（forward/proxy）
  3. Windows/Linux両方で許可する（firewall）
     の3点セットです。

---

## ９ Windows側でNATの証拠を取る（ipconfig / Get-NetNat）

![NN9.証拠の確認：Windowsからの視点](/images/network/NN9.証拠の確認：Windowsからの視点.jpg)

### 図の要旨

Windows側で、WSL用の仮想NICとNAT設定を“見える化”する。

### 詳細解説

* 確認観点：

  * Windowsに `vEthernet (WSL)` のようなIFがある
  * そのIFのIPが、WSL側の `default via` と一致する（=ゲートウェイ）
  * `Get-NetNat` で WSL用NAT（例：WSLNat）が存在する
* これで「WSLの出口がWindowsである」ことが腹落ちします。

### Tips（PowerShellでの観測）

```powershell
ipconfig /all
Get-NetNat
Get-NetIPAddress | ? {$_.InterfaceAlias -like "*WSL*"}
```

* “WSL側の ip route と Windows側の vEthernet のIPが対応する”のが重要ポイントです。

---

## １０ 外部からWSLへ：ポートプロキシ（Windowsに“橋”を架ける）

![NN10.外部からWSLへ：ポートプロキシ](/images/network/NN10.外部からWSLへ：ポートプロキシ.jpg)

### 図の要旨

`netsh interface portproxy` で、Windowsが受けた通信をWSLへ中継する。

### 詳細解説

* 目的：スマホや別PCから、WSL上のWebサーバが見えるようにする
* 仕組み：

  * Windows（0.0.0.0:3000 など）で待受
  * 受けた通信を WSLのIP:port に転送
* パラメータの意味（最低限）：

  * `listenport`：Windowsが待つポート
  * `listenaddress=0.0.0.0`：全IFで待つ（=LANから来ても受ける）
  * `connectaddress`：転送先（WSLのIP）
  * `connectport`：転送先ポート（WSLアプリが待っているポート）

### Tips（実務での手順テンプレ）

```powershell
# 1) WSLのIPを取る（WSL内）
# ip -4 addr show eth0

# 2) Windows側で待受→WSLへ転送（例：3000）
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSLのIP>

# 3) 既存ルール確認
netsh interface portproxy show all
```

* 注意：Windows Firewallで `listenport` を許可しないと、LANから届きません（Layer3に戻る）。

---

## １１ 設定ファイル：.wslconfig と wsl.conf（コントロールルーム）

![NN11.設定ファイル：コントロールルーム](/images/network/NN11.設定ファイル：コントロールルーム.jpg)

### 図の要旨

WSLの挙動は **Windows側の .wslconfig** と **Linux側の /etc/wsl.conf** で制御される。

### 詳細解説

* **.wslconfig（Windows側）**

  * 置き場所：`%UserProfile%\.wslconfig`
  * 対象：全ディストリビューションに効く“グローバル設定”
  * ネットワーク系：`dnsTunneling`、（発展で）`networkingMode` など
* **wsl.conf（Linux側）**

  * 置き場所：`/etc/wsl.conf`
  * 対象：そのディストリ単位の設定
  * ネットワーク系：`generateResolvConf`、hostname 等

### Tips（設定変更後の反映）

```powershell
# Windows側でWSLを完全停止→再起動
wsl --shutdown
```

* “再起動したのに変わらない”は、WSLが止まり切っていない／別の設定が上書き、などが原因になりがちです。

---

## １２ よくある落とし穴：VPNとMTU問題（大きい通信だけ止まる）

![NN12.よくある落とし穴：VPNとMTU問題](/images/network/NN12.よくある落とし穴：VPNとMTU問題.jpg)

### 図の要旨

VPNトンネルでMTUが小さくなると、WSL側の1500バイト前提の通信が落ちることがある。

### 詳細解説

* 用語整理：

  * **MTU**：1回で送れる最大パケットサイズ
* 症状：

  * Web閲覧はできるのに、`git clone` や大きなDLだけ固まる
* 原因：

  * VPNヘッダ分だけ実質MTUが減り、大きいパケットが途中で落ちる（断片化やICMP制御が絡むと特に厄介）

### Tips（応急処置の代表例）

```bash
# 例：VPNの実効MTUが1400前後の場合
sudo ip link set dev eth0 mtu 1400
ip link show eth0
```

* 恒久対応は環境ごとに異なるため、まず「症状がMTUっぽいか」を切り分けるのが先です。

---

## １３ 診断ワークフロー：切り分けの一本道

![NN13.診断ワークフロー](/images/network/NN13.診断ワークフロー.jpg)

### 図の要旨

「IP→Route→Ping→DNS→Firewall」の順で、問題箇所を確定する。

### 詳細解説

* この順でやる理由：

  * どの段で壊れているかを確定すると、次の作業が“設定変更”ではなく“原因への手当て”になる。
* 具体ステップ：

  1. `ip addr`：IPがある
  2. `ip route`：出口がある
  3. `ping 8.8.8.8`：外へ出られる
  4. `ping google.com`：DNSが引ける
  5. だめならFirewall（Windows/Linux）

### Tips（コマンド一本道）

```bash
ip -4 addr show eth0
ip route
ping -c 1 8.8.8.8
ping -c 1 google.com
```

---

## １４ 発展：Mirrored Mode（NATの代替という選択肢）

![NN14.新しい選択し：MirroredMode](/images/network/NN14.新しい選択し：MirroredMode.jpg)

### 図の要旨

Windows 11 22H2+ では、NATではなく **Mirrored Mode** という設計が選べる（場合がある）。

### 詳細解説

* 位置づけ：

  * あなたの環境がNATであることと、Mirrored Modeを知ることは矛盾しません。
  * 「NATの壁が何を生むか」を理解した上で、「別解がある」として把握する章です。
* 典型的なメリット（概念）：

  * localhost相互アクセスが自然
  * IPv6周りが改善される場合
  * LAN内デバイスからWSLへ直接届かせやすくなる（＝portproxy依存が減る）

### Tips（設定の入口だけ押さえる）

* 設定は `.wslconfig` 側で行う（例：`networkingMode=mirrored`）。
  ただし、導入可否・副作用は環境差が大きいので、**“NATで困ってから検討”**が安全です。

---

## １５ まとめ：必須コマンド一覧（WSL側／Windows側）

![NN15.まとめ：必須コマンド一覧](/images/network/NN15.まとめ：必須コマンド一覧.jpg)

### 図の要旨

最小限これだけ押さえれば、観測→切り分け→対処の入口に立てる。

### 詳細解説

* WSL（Linux）側：自分の状態（IP/Route/DNS/MTU）を観測する
* Windows（PowerShell）側：NAT/転送/再起動を操作する
* “どっちで打つコマンドか”を分けて覚えるのが最大のコツ

### Tips（コピペ用）

```bash
# Linux（WSL）Side
ip -4 addr show eth0
ip route
cat /etc/resolv.conf
sudo ip link set dev eth0 mtu 1400
```

```powershell
# Windows（PowerShell）Side
Get-NetNat
netsh interface portproxy show all
wsl --shutdown
```
