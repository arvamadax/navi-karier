//! PDF text extraction: a port of PyPDF2 3.0.1 `PageObject.extract_text()` (the library the
//! Python backend uses). It reproduces PyPDF2's operator handling, its font/encoding rules
//! (`_cmap.py`) and its newline/space heuristics, because the rule-based analysis fallback
//! depends on `len(text)` and substring matches, so even whitespace differences change scores.
//!
//! `lopdf` is used only for object access and stream decompression. Encoding tables
//! (`data/pypdf2_tables.json`) are dumped from PyPDF2 itself by `data/gen_data.py`.

use std::{collections::HashMap, rc::Rc, sync::LazyLock};

use lopdf::{Dictionary, Document, Object};
use serde::Deserialize;
use serde_json::{Map, Value};

type Res<T> = Result<T, String>;

#[derive(Deserialize)]
struct Tables {
    glyphs: HashMap<String, String>,
    charset: HashMap<String, Vec<String>>,
    pdfdoc: Vec<String>,
}
static TABLES: LazyLock<Tables> =
    LazyLock::new(|| serde_json::from_str(include_str!("../data/pypdf2_tables.json")).expect("pypdf2_tables.json"));

const DEFAULT_SPACE_WIDTH: f64 = 200.0;

fn default_font_space_width(base_font: &str) -> Option<f64> {
    Some(match base_font {
        "/Courrier" | "/Courier-Bold" | "/Courier-BoldOblique" | "/Courier-Oblique" => 600.0,
        "/Helvetica" | "/Helvetica-Bold" | "/Helvetica-BoldOblique" | "/Helvetica-Oblique" => 278.0,
        "/Helvetica-Narrow" | "/Helvetica-NarrowBold" | "/Helvetica-NarrowBoldOblique" | "/Helvetica-NarrowOblique" => 228.0,
        "/Times-Roman" | "/Times-Bold" | "/Times-BoldItalic" | "/Times-Italic" | "/Symbol" => 250.0,
        "/ZapfDingbats" => 278.0,
        _ => return None,
    })
}

// ------------------------------------------------------------------ content stream tokens

#[derive(Debug, Clone)]
enum Operand {
    Num(f64),
    Int(i64),
    Name(String),
    /// TextStringObject: only the synthetic " " PyPDF2 inserts for wide TJ gaps (used verbatim).
    Text(String),
    /// ByteStringObject: every string read from a content stream; goes through the font encoding.
    Bytes(Vec<u8>),
    Array(Vec<Operand>),
    Other,
}

impl Operand {
    fn num(&self) -> Res<f64> {
        match self {
            Operand::Num(f) => Ok(*f),
            Operand::Int(i) => Ok(*i as f64),
            o => Err(format!("float() of {o:?}")),
        }
    }
}

fn is_ws(b: u8) -> bool {
    matches!(b, 0 | 9 | 10 | 12 | 13 | 32)
}
fn is_delim(b: u8) -> bool {
    is_ws(b) || matches!(b, b'(' | b')' | b'<' | b'>' | b'[' | b']' | b'{' | b'}' | b'/' | b'%')
}

/// `create_string_object(bytes, forced_encoding="bytes")`: PyPDF2 parses page and XObject content
/// streams with `forced_encoding="bytes"`, so every operand string is a ByteStringObject and always
/// goes through the font encoding (never the PDFDocEncoding shortcut).
fn make_string(bytes: Vec<u8>) -> Operand {
    Operand::Bytes(bytes)
}

struct Lexer<'a> {
    d: &'a [u8],
    p: usize,
}

impl Lexer<'_> {
    fn skip_ws(&mut self) {
        while self.p < self.d.len() && is_ws(self.d[self.p]) {
            self.p += 1;
        }
    }

    fn read_object(&mut self) -> Res<Operand> {
        self.skip_ws();
        let Some(&c) = self.d.get(self.p) else { return Err("unexpected end of stream".into()) };
        match c {
            b'/' => {
                self.p += 1;
                let s = self.p;
                while self.p < self.d.len() && !is_delim(self.d[self.p]) {
                    self.p += 1;
                }
                Ok(Operand::Name(format!("/{}", decode_name(&self.d[s..self.p]))))
            }
            b'<' if self.d.get(self.p + 1) == Some(&b'<') => {
                self.p += 2;
                loop {
                    self.skip_ws();
                    if self.d.get(self.p..self.p + 2) == Some(b">>") {
                        self.p += 2;
                        return Ok(Operand::Other);
                    }
                    if self.p >= self.d.len() {
                        return Err("dictionary truncated".into());
                    }
                    self.read_object()?; // key
                    self.read_object()?; // value
                }
            }
            b'<' => {
                self.p += 1;
                let mut digits = vec![];
                loop {
                    self.skip_ws();
                    let Some(&b) = self.d.get(self.p) else { return Err("hex string truncated".into()) };
                    self.p += 1;
                    if b == b'>' {
                        break;
                    }
                    digits.push(b);
                }
                if digits.len() % 2 == 1 {
                    digits.push(b'0');
                }
                let mut bytes = vec![];
                for pair in digits.chunks(2) {
                    let s = std::str::from_utf8(pair).map_err(|e| e.to_string())?;
                    bytes.push(u8::from_str_radix(s, 16).map_err(|e| e.to_string())?);
                }
                Ok(make_string(bytes))
            }
            b'[' => {
                self.p += 1;
                let mut items = vec![];
                loop {
                    self.skip_ws();
                    match self.d.get(self.p) {
                        None => return Err("array truncated".into()),
                        Some(b']') => {
                            self.p += 1;
                            return Ok(Operand::Array(items));
                        }
                        _ => items.push(self.read_object()?),
                    }
                }
            }
            b'(' => self.read_literal_string(),
            b'%' => {
                while self.p < self.d.len() && !matches!(self.d[self.p], b'\r' | b'\n') {
                    self.p += 1;
                }
                self.read_object()
            }
            b't' | b'f' | b'n' => {
                let s = self.p;
                while self.p < self.d.len() && !is_delim(self.d[self.p]) {
                    self.p += 1;
                }
                Ok(Operand::Other).map(|o| {
                    let _ = &self.d[s..self.p];
                    o
                })
            }
            b'0'..=b'9' | b'+' | b'-' | b'.' => {
                let s = self.p;
                while self.p < self.d.len() && matches!(self.d[self.p], b'0'..=b'9' | b'+' | b'-' | b'.') {
                    self.p += 1;
                }
                let t = std::str::from_utf8(&self.d[s..self.p]).unwrap();
                if let Ok(i) = t.parse::<i64>() {
                    Ok(Operand::Int(i))
                } else {
                    t.parse::<f64>().map(Operand::Num).map_err(|_| format!("bad number {t:?}"))
                }
            }
            other => Err(format!("Invalid Elementary Object starting with {:?}", other as char)),
        }
    }

    fn read_literal_string(&mut self) -> Res<Operand> {
        self.p += 1;
        let mut parens = 1;
        let mut out = vec![];
        loop {
            let Some(&c) = self.d.get(self.p) else { return Err("string truncated".into()) };
            self.p += 1;
            match c {
                b'(' => {
                    parens += 1;
                    out.push(c)
                }
                b')' => {
                    parens -= 1;
                    if parens == 0 {
                        break;
                    }
                    out.push(c)
                }
                b'\\' => {
                    let Some(&e) = self.d.get(self.p) else { return Err("string truncated".into()) };
                    self.p += 1;
                    match e {
                        b'n' => out.push(b'\n'),
                        b'r' => out.push(b'\r'),
                        b't' => out.push(b'\t'),
                        b'b' => out.push(8),
                        b'f' => out.push(12),
                        b'c' => out.extend_from_slice(b"\\c"),
                        b'0'..=b'7' => {
                            let mut v = (e - b'0') as u32;
                            for _ in 0..2 {
                                match self.d.get(self.p) {
                                    Some(&n @ b'0'..=b'7') => {
                                        v = v * 8 + (n - b'0') as u32;
                                        self.p += 1;
                                    }
                                    _ => break,
                                }
                            }
                            out.push((v & 0xFF) as u8);
                        }
                        b'\n' | b'\r' => {
                            if let Some(&n) = self.d.get(self.p) {
                                if matches!(n, b'\n' | b'\r') {
                                    self.p += 1;
                                }
                            }
                        }
                        other => out.push(other),
                    }
                }
                _ => out.push(c),
            }
        }
        Ok(make_string(out))
    }
}

fn decode_name(raw: &[u8]) -> String {
    let mut out = vec![];
    let mut i = 0;
    while i < raw.len() {
        if raw[i] == b'#' && i + 2 < raw.len() + 0 && raw.len() >= i + 3 {
            if let Ok(v) = u8::from_str_radix(std::str::from_utf8(&raw[i + 1..i + 3]).unwrap_or("zz"), 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(raw[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn parse_content(data: &[u8]) -> Res<Vec<(Vec<Operand>, Vec<u8>)>> {
    let mut lx = Lexer { d: data, p: 0 };
    let mut ops = vec![];
    let mut operands = vec![];
    loop {
        lx.skip_ws();
        let Some(&c) = lx.d.get(lx.p) else { break };
        if c == 0 {
            break;
        }
        if c.is_ascii_alphabetic() || c == b'\'' || c == b'"' {
            let s = lx.p;
            while lx.p < lx.d.len() && !is_delim(lx.d[lx.p]) {
                lx.p += 1;
            }
            if lx.p == s {
                lx.p += 1; // lone quote char: operator of length 1
            }
            let op = lx.d[s..lx.p].to_vec();
            if op == b"BI" {
                // inline image: skip to " EI"
                let rest = &lx.d[lx.p..];
                let end = rest.windows(3).position(|w| is_ws(w[0]) && &w[1..] == b"EI").map(|i| i + 3).unwrap_or(rest.len());
                lx.p += end;
                operands.clear();
                ops.push((vec![], b"INLINE IMAGE".to_vec()));
            } else {
                ops.push((std::mem::take(&mut operands), op));
            }
        } else if c == b'%' {
            while lx.p < lx.d.len() && !matches!(lx.d[lx.p], b'\r' | b'\n') {
                lx.p += 1;
            }
        } else {
            operands.push(lx.read_object()?);
        }
    }
    Ok(ops)
}

// ------------------------------------------------------------------ fonts (`_cmap.py`)

#[derive(Clone)]
enum Enc {
    /// Python codec name ("charmap", "utf-16-be", or an unknown name that always fails to decode).
    Codec(String),
    Table(HashMap<u8, String>),
}

struct Font {
    /// `float(sp_width / 2)`
    space_width: f64,
    enc: Enc,
    /// `/ToUnicode` map, insertion ordered, keys are the decoded source strings.
    map: Map<String, Value>,
}

fn unknown_font() -> Font {
    Font { space_width: 9999.0, enc: Enc::Table((0..=255u8).map(|b| (b, "\u{FFFD}".to_string())).collect()), map: Map::new() }
}

struct Pdf<'a> {
    doc: &'a Document,
}

impl<'a> Pdf<'a> {
    fn deref(&self, o: &'a Object) -> &'a Object {
        let mut cur = o;
        for _ in 0..32 {
            match cur {
                Object::Reference(id) => match self.doc.get_object(*id) {
                    Ok(n) => cur = n,
                    Err(_) => return &Object::Null,
                },
                _ => return cur,
            }
        }
        cur
    }
    fn get(&self, d: &'a Dictionary, key: &str) -> Option<&'a Object> {
        d.get(key.as_bytes()).ok().map(|o| self.deref(o))
    }
    fn dict(&self, o: &'a Object) -> Option<&'a Dictionary> {
        match self.deref(o) {
            Object::Dictionary(d) => Some(d),
            Object::Stream(s) => Some(&s.dict),
            _ => None,
        }
    }
    fn name(&self, d: &'a Dictionary, key: &str) -> Option<String> {
        match self.get(d, key)? {
            Object::Name(n) => Some(format!("/{}", String::from_utf8_lossy(n))),
            _ => None,
        }
    }
    fn f64(&self, o: &'a Object) -> Option<f64> {
        match self.deref(o) {
            Object::Integer(i) => Some(*i as f64),
            Object::Real(r) => Some(*r as f64),
            _ => None,
        }
    }
    fn stream_data(&self, o: &'a Object) -> Option<Vec<u8>> {
        match self.deref(o) {
            Object::Stream(s) => Some(s.decompressed_content().unwrap_or_else(|_| s.content.clone())),
            _ => None,
        }
    }

    fn build_char_map(&self, ft: &'a Dictionary) -> Res<Font> {
        let (encoding, mut space_code) = self.parse_encoding(ft)?;
        let (map, sc2, int_entry) = self.parse_to_unicode(ft, space_code)?;
        space_code = sc2;
        let nbytes = map.get("-1").and_then(Value::as_i64);

        let enc = match encoding {
            EncodingOrEmpty::Empty => {
                if nbytes.is_none() || nbytes == Some(1) {
                    Enc::Codec("charmap".into())
                } else {
                    Enc::Codec("utf-16-be".into())
                }
            }
            EncodingOrEmpty::Enc(Enc::Table(mut t)) => {
                for x in int_entry {
                    if x <= 255 {
                        t.insert(x as u8, char::from_u32(x).unwrap().to_string());
                    }
                }
                Enc::Table(t)
            }
            EncodingOrEmpty::Enc(e) => e,
        };
        let mut space_width = DEFAULT_SPACE_WIDTH;
        if let Some(bf) = self.name(ft, "BaseFont") {
            if let Some(w) = default_font_space_width(&bf) {
                space_width = w;
            }
        }
        let sp: i64 = match &space_code {
            Sp::Int(i) => *i,
            Sp::Str(s) => {
                let c = s.chars().next().unwrap_or('\0');
                if (c as u32) < 256 {
                    c as i64
                } else {
                    let mut b = [0u16; 2];
                    let u = c.encode_utf16(&mut b)[0];
                    (u >> 8) as i64 + 256 * (u & 0xFF) as i64
                }
            }
        };
        let sp_width = self.compute_space_width(ft, sp, space_width);
        // map keys: drop the synthetic -1 entry
        let mut map = map;
        map.remove("-1");
        Ok(Font { space_width: sp_width / 2.0, enc, map })
    }

    fn parse_encoding(&self, ft: &'a Dictionary) -> Res<(EncodingOrEmpty, Sp)> {
        let t = &*TABLES;
        let mut space_code = Sp::Int(32);
        let subtype = self.name(ft, "Subtype").ok_or("font without /Subtype")?;
        let to_table = |v: &Vec<String>| -> HashMap<u8, String> { v.iter().enumerate().map(|(i, c)| (i as u8, c.clone())).collect() };

        let Some(enc_obj) = self.get(ft, "Encoding") else {
            let base = self.name(ft, "BaseFont");
            if let Some(bf) = &base {
                if let Some(w) = default_font_space_width(bf) {
                    let _ = w;
                    let enc = match t.charset.get(bf) {
                        Some(tbl) => Enc::Table(to_table(tbl)),
                        None => Enc::Codec("charmap".into()),
                    };
                    return Ok((EncodingOrEmpty::Enc(enc), Sp::Int(w as i64)));
                }
            }
            return Ok(if subtype == "/Type1" {
                (EncodingOrEmpty::Enc(Enc::Codec("charmap".into())), space_code)
            } else {
                (EncodingOrEmpty::Empty, space_code)
            });
        };

        let mut table: Vec<String>;
        let mut codec: Option<String> = None;
        let mut diffs: Option<&Vec<Object>> = None;
        match enc_obj {
            Object::Name(n) => {
                let name = format!("/{}", String::from_utf8_lossy(n));
                if let Some(tbl) = t.charset.get(&name) {
                    table = tbl.clone();
                } else {
                    table = vec![];
                    codec = Some(match name.as_str() {
                        "/Identity-H" | "/Identity-V" => "utf-16-be".to_string(),
                        "/GB-EUC-H" | "/GB-EUC-V" => "gbk".to_string(),
                        "/GBpc-EUC-H" | "/GBpc-EUC-V" => "gb2312".to_string(),
                        _ => name,
                    });
                }
            }
            Object::Dictionary(d) => {
                table = match self.name(d, "BaseEncoding").and_then(|b| t.charset.get(&b)) {
                    Some(tbl) => tbl.clone(),
                    None => t.charset["/StandardCoding"].clone(),
                };
                if let Some(Object::Array(a)) = self.get(d, "Differences") {
                    diffs = Some(a);
                }
            }
            _ => table = t.charset["/StandardCoding"].clone(),
        }
        if let (Some(a), None) = (diffs, &codec) {
            let mut x: usize = 0;
            for o in a {
                match self.deref(o) {
                    Object::Integer(i) => x = *i as usize,
                    Object::Real(r) => x = *r as usize,
                    Object::Name(n) => {
                        let g = format!("/{}", String::from_utf8_lossy(n));
                        let v = t.glyphs.get(&g).cloned().unwrap_or_else(|| g.clone());
                        if x >= table.len() {
                            return Err("Differences index out of range".into());
                        }
                        if !t.glyphs.contains_key(&g) && g == " " {
                            space_code = Sp::Int(x as i64);
                        }
                        table[x] = v;
                        x += 1;
                    }
                    _ => {}
                }
            }
        }
        Ok(match codec {
            Some(c) => (EncodingOrEmpty::Enc(Enc::Codec(c)), space_code),
            None => (EncodingOrEmpty::Enc(Enc::Table(to_table(&table))), space_code),
        })
    }

    fn parse_to_unicode(&self, ft: &'a Dictionary, space_code: Sp) -> Res<(Map<String, Value>, Sp, Vec<u32>)> {
        let mut map = Map::new();
        let mut int_entry = vec![];
        let Some(tu) = self.get(ft, "ToUnicode") else { return Ok((map, space_code, int_entry)) };
        let raw = match tu {
            Object::Stream(_) => self.stream_data(tu).unwrap_or_default(),
            Object::Name(n) if n.starts_with(b"Identity") => b"beginbfrange\n<0000> <0001> <0000>\nendbfrange".to_vec(),
            _ => return Err("unsupported /ToUnicode".into()),
        };
        let cm = prepare_cm(&raw);
        let (mut rg, mut ch) = (false, false);
        let mut multi: Option<(i64, i64)> = None;
        for l in cm.split(|&b| b == b'\n') {
            let l = trim_spaces(l);
            if l.is_empty() || l[0] == b'%' {
                continue;
            }
            if contains(l, b"beginbfrange") {
                rg = true;
            } else if contains(l, b"endbfrange") {
                rg = false;
            } else if contains(l, b"beginbfchar") {
                ch = true;
            } else if contains(l, b"endbfchar") {
                ch = false;
            } else if rg {
                multi = parse_bfrange(l, &mut map, &mut int_entry, multi)?;
            } else if ch {
                parse_bfchar(l, &mut map, &mut int_entry)?;
            }
        }
        let mut sc = space_code;
        for (k, v) in &map {
            if k != "-1" && v.as_str() == Some(" ") {
                sc = Sp::Str(k.clone());
            }
        }
        Ok((map, sc, int_entry))
    }

    fn compute_space_width(&self, ft: &'a Dictionary, space_code: i64, space_width: f64) -> f64 {
        let mut sp_width = space_width * 2.0;
        if let Some(Object::Array(df)) = self.get(ft, "DescendantFonts") {
            let ft1 = df.first().and_then(|o| self.dict(o));
            let mut w1: HashMap<i64, f64> = HashMap::new();
            let dw = ft1.and_then(|d| self.get(d, "DW")).and_then(|o| self.f64(o)).unwrap_or(1000.0);
            let w: Vec<&Object> = match ft1.and_then(|d| self.get(d, "W")) {
                Some(Object::Array(a)) => a.iter().map(|o| self.deref(o)).collect(),
                _ => vec![],
            };
            let mut i = 0;
            while i + 1 < w.len() {
                let Object::Integer(st) = w[i] else { break };
                match w[i + 1] {
                    Object::Integer(second) => {
                        if i + 2 >= w.len() {
                            break;
                        }
                        let v = self.f64(w[i + 2]).unwrap_or(0.0);
                        for x in *st..*second {
                            w1.insert(x, v);
                        }
                        i += 3;
                    }
                    Object::Array(arr) => {
                        let mut s = *st;
                        for y in arr {
                            w1.insert(s, self.f64(y).unwrap_or(0.0));
                            s += 1;
                        }
                        i += 2;
                    }
                    _ => break,
                }
            }
            sp_width = w1.get(&space_code).copied().unwrap_or(dw / 2.0);
        } else if let Some(Object::Array(wa)) = self.get(ft, "Widths") {
            let w: Vec<f64> = wa.iter().map(|o| self.f64(o).unwrap_or(0.0)).collect();
            let attempt = (|| {
                let st = self.f64(self.get(ft, "FirstChar")?)? as i64;
                let en = self.f64(self.get(ft, "LastChar")?)? as i64;
                if st > space_code || en < space_code {
                    return None;
                }
                let v = *w.get((space_code - st) as usize)?;
                if v == 0.0 {
                    None
                } else {
                    Some(v)
                }
            })();
            sp_width = match attempt {
                Some(v) => v,
                None => {
                    let missing = self
                        .get(ft, "FontDescriptor")
                        .and_then(|o| self.dict(o))
                        .and_then(|d| self.get(d, "MissingWidth"))
                        .and_then(|o| self.f64(o));
                    match missing {
                        Some(m) => m,
                        None => {
                            let pos: Vec<f64> = w.iter().copied().filter(|x| *x > 0.0).collect();
                            pos.iter().sum::<f64>() / (pos.len().max(1) as f64) / 2.0
                        }
                    }
                }
            };
        }
        sp_width
    }
}

enum EncodingOrEmpty {
    Empty,
    Enc(Enc),
}
enum Sp {
    Int(i64),
    Str(String),
}

fn contains(h: &[u8], n: &[u8]) -> bool {
    h.windows(n.len()).any(|w| w == n)
}
fn trim_spaces(mut b: &[u8]) -> &[u8] {
    while b.first() == Some(&b' ') {
        b = &b[1..];
    }
    while b.last() == Some(&b' ') {
        b = &b[..b.len() - 1];
    }
    b
}
fn replace(h: &[u8], from: &[u8], to: &[u8]) -> Vec<u8> {
    let mut out = vec![];
    let mut i = 0;
    while i < h.len() {
        if h[i..].starts_with(from) {
            out.extend_from_slice(to);
            i += from.len();
        } else {
            out.push(h[i]);
            i += 1;
        }
    }
    out
}

fn prepare_cm(raw: &[u8]) -> Vec<u8> {
    let ws = |b: &u8| matches!(b, b' ' | b'\t' | b'\n' | b'\r' | 0x0b | 0x0c);
    let start = raw.iter().position(|b| !ws(b)).unwrap_or(raw.len());
    let end = raw.iter().rposition(|b| !ws(b)).map(|i| i + 1).unwrap_or(start);
    let mut cm = raw[start..end].to_vec();
    for (a, b) in [
        (&b"beginbfchar"[..], &b"\nbeginbfchar\n"[..]),
        (b"endbfchar", b"\nendbfchar\n"),
        (b"beginbfrange", b"\nbeginbfrange\n"),
        (b"endbfrange", b"\nendbfrange\n"),
        (b"<<", b"\n{\n"),
        (b">>", b"\n}\n"),
    ] {
        cm = replace(&cm, a, b);
    }
    let mut parts: Vec<Vec<u8>> = cm.split(|&b| b == b'<').map(|p| p.to_vec()).collect();
    for p in parts.iter_mut() {
        if let Some(j) = p.iter().position(|&b| b == b'>') {
            let content: Vec<u8> = if j == 0 { b".".to_vec() } else { p[..j].iter().copied().filter(|&b| b != b' ').collect() };
            let mut n = content;
            n.push(b' ');
            n.extend_from_slice(&p[j + 1..]);
            *p = n;
        }
    }
    let joined = parts.join(&b' ');
    let joined = replace(&joined, b"[", b" [ ");
    let joined = replace(&joined, b"]", b" ]\n ");
    replace(&joined, b"\r", b"\n")
}

fn unhex(h: &[u8]) -> Res<Vec<u8>> {
    if h.len() % 2 == 1 {
        return Err("odd-length hex".into());
    }
    h.chunks(2)
        .map(|p| u8::from_str_radix(std::str::from_utf8(p).map_err(|e| e.to_string())?, 16).map_err(|e| e.to_string()))
        .collect()
}
fn utf16be(b: &[u8]) -> Res<String> {
    if b.len() % 2 == 1 {
        return Err("truncated utf-16 data".into());
    }
    let units: Vec<u16> = b.chunks_exact(2).map(|c| u16::from_be_bytes([c[0], c[1]])).collect();
    Ok(char::decode_utf16(units).map(|r| r.unwrap_or('\u{FFFD}')).collect())
}
fn latin1(b: &[u8]) -> String {
    b.iter().map(|&x| x as char).collect()
}
fn decode_key(bytes: &[u8], nbytes: i64) -> Res<String> {
    if nbytes == 1 {
        Ok(latin1(bytes))
    } else {
        utf16be(bytes)
    }
}
fn hex_int(h: &[u8]) -> Res<i64> {
    i64::from_str_radix(std::str::from_utf8(h).map_err(|e| e.to_string())?, 16).map_err(|e| e.to_string())
}

fn parse_bfrange(l: &[u8], map: &mut Map<String, Value>, int_entry: &mut Vec<u32>, multi: Option<(i64, i64)>) -> Res<Option<(i64, i64)>> {
    let lst: Vec<&[u8]> = l.split(|&b| b == b' ').filter(|x| !x.is_empty()).collect();
    if lst.len() < 2 {
        return Err("bad bfrange line".into());
    }
    let nbi = lst[0].len().max(lst[1].len());
    let nbytes = nbi.div_ceil(2) as i64;
    map.insert("-1".into(), Value::from(nbytes));
    let width = (nbytes * 2) as usize;
    let key_for = |a: i64| -> Res<String> { decode_key(&unhex(format!("{a:0width$X}").as_bytes())?, nbytes) };
    let mut closure = false;
    let (mut a, b);
    if let Some((ma, mb)) = multi {
        a = ma;
        b = mb;
        for sq in &lst[1..] {
            if *sq == b"]" {
                closure = true;
                break;
            }
            map.insert(key_for(a)?, Value::String(utf16be(&unhex(sq)?)?));
            int_entry.push(a as u32);
            a += 1;
        }
    } else {
        a = hex_int(lst[0])?;
        b = hex_int(lst[1])?;
        let third = lst.get(2).ok_or("bad bfrange line")?;
        if *third == b"[" {
            for sq in &lst[3..] {
                if *sq == b"]" {
                    closure = true;
                    break;
                }
                map.insert(key_for(a)?, Value::String(utf16be(&unhex(sq)?)?));
                int_entry.push(a as u32);
                a += 1;
            }
        } else {
            let mut c = hex_int(third)?;
            let w2 = third.len().max(4);
            closure = true;
            while a <= b {
                map.insert(key_for(a)?, Value::String(utf16be(&unhex(format!("{c:0w2$X}").as_bytes())?)?));
                int_entry.push(a as u32);
                a += 1;
                c += 1;
            }
        }
    }
    Ok(if closure { None } else { Some((a, b)) })
}

fn parse_bfchar(l: &[u8], map: &mut Map<String, Value>, int_entry: &mut Vec<u32>) -> Res<()> {
    let mut lst: Vec<&[u8]> = l.split(|&b| b == b' ').filter(|x| !x.is_empty()).collect();
    let nbytes = (lst.first().ok_or("bad bfchar line")?.len() / 2) as i64;
    map.insert("-1".into(), Value::from(nbytes));
    while lst.len() > 1 {
        let to = if lst[1] == b"." {
            String::new()
        } else {
            let raw = unhex(lst[1])?;
            if lst[1].len() < 4 {
                latin1(&raw)
            } else {
                utf16be(&raw)?
            }
        };
        map.insert(decode_key(&unhex(lst[0])?, nbytes)?, Value::String(to));
        int_entry.push(hex_int(lst[0])? as u32);
        lst.drain(..2);
    }
    Ok(())
}

// ------------------------------------------------------------------ the extraction state machine

struct Ex<'a> {
    pdf: &'a Pdf<'a>,
    resources: Option<&'a Dictionary>,
    cmaps: HashMap<String, Rc<Font>>,
    out: String,
    text: String,
    rtl: bool,
    cm: [f64; 6],
    stack: Vec<([f64; 6], Rc<Font>, f64, f64, f64, f64, f64)>,
    tm: [f64; 6],
    tm_prev: [f64; 6],
    char_scale: f64,
    space_scale: f64,
    space_width: f64,
    tl: f64,
    font_size: f64,
    font: Rc<Font>,
}

fn mult(m: &[f64; 6], n: &[f64; 6]) -> [f64; 6] {
    [
        m[0] * n[0] + m[1] * n[2],
        m[0] * n[1] + m[1] * n[3],
        m[2] * n[0] + m[3] * n[2],
        m[2] * n[1] + m[3] * n[3],
        m[4] * n[0] + m[5] * n[2] + n[4],
        m[4] * n[1] + m[5] * n[3] + n[5],
    ]
}

fn orient(m: &[f64; 6]) -> i32 {
    if m[3] > 1e-6 {
        0
    } else if m[3] < -1e-6 {
        180
    } else if m[1] > 0.0 {
        90
    } else {
        270
    }
}

fn is_rtl_special(x: u32) -> bool {
    // CUSTOM_RTL_SPECIAL_CHARS is empty by default
    let _ = x;
    false
}

impl<'a> Ex<'a> {
    fn last_char(&self) -> Option<char> {
        self.text.chars().last().or_else(|| self.out.chars().last())
    }

    fn decode_bytes(&self, tt: &[u8]) -> Res<String> {
        match &self.font.enc {
            Enc::Codec(c) => {
                let try_codec = |name: &str| -> Res<String> {
                    match name {
                        "charmap" => Ok(latin1(tt)),
                        "utf-16-be" => utf16be(tt),
                        other => Err(format!("unsupported codec {other}")),
                    }
                };
                try_codec(c).or_else(|_| try_codec(if c == "charmap" { "utf-16-be" } else { "charmap" }))
            }
            Enc::Table(t) => {
                let mut s = String::new();
                for &x in tt {
                    match t.get(&x) {
                        Some(v) => s.push_str(v),
                        None if x < 0x80 => s.push(x as char),
                        None => return Err("'utf-8' codec can't decode byte".into()),
                    }
                }
                Ok(s)
            }
        }
    }

    fn tj(&mut self, operand: &Operand) -> Res<()> {
        // orientation filter: all four orientations are accepted by extract_text()
        match operand {
            Operand::Text(s) => self.text.push_str(s),
            Operand::Bytes(b) => {
                let t = self.decode_bytes(b)?;
                let mapped: String = t
                    .chars()
                    .map(|c| match self.font.map.get(&c.to_string()) {
                        Some(Value::String(v)) => v.clone(),
                        _ => c.to_string(),
                    })
                    .collect();
                for x in mapped.chars() {
                    let xx = x as u32;
                    if xx <= 0x2F || (0x3A..=0x40).contains(&xx) || (0x2000..=0x206F).contains(&xx) || (0x20A0..=0x21FF).contains(&xx) || is_rtl_special(xx) {
                        if self.rtl {
                            self.text.insert(0, x)
                        } else {
                            self.text.push(x)
                        }
                    } else if (0x0590..=0x08FF).contains(&xx) || (0xFB1D..=0xFDFF).contains(&xx) || (0xFE70..=0xFEFF).contains(&xx) {
                        if !self.rtl {
                            self.rtl = true;
                            let t = std::mem::take(&mut self.text);
                            self.out.push_str(&t);
                        }
                        self.text.insert(0, x);
                    } else {
                        if self.rtl {
                            self.rtl = false;
                            let t = std::mem::take(&mut self.text);
                            self.out.push_str(&t);
                        }
                        self.text.push(x);
                    }
                }
            }
            other => return Err(format!("Tj operand {other:?}")),
        }
        Ok(())
    }

    fn crlf_space(&mut self) {
        let m = mult(&self.tm, &self.cm);
        let orientation = orient(&m);
        let dx = m[4] - self.tm_prev[4];
        let dy = m[5] - self.tm_prev[5];
        let k = ((m[0] * m[3]).abs() + (m[1] * m[2]).abs()).sqrt();
        let f = self.font_size * k;
        self.tm_prev = m;
        let sw = self.space_width / 1000.0;
        let (newline, along, across) = match orientation {
            0 => (dy < -0.8 * f, dy.abs(), dx.abs()),
            180 => (dy > 0.8 * f, dy.abs(), dx.abs()),
            90 => (dx > 0.8 * f, dx.abs(), dy.abs()),
            _ => (dx < -0.8 * f, dx.abs(), dy.abs()),
        };
        // `(output + text)[-1]` raises IndexError on empty -> the whole block is skipped.
        let Some(last) = self.last_char() else { return };
        if newline {
            if last != '\n' {
                let t = std::mem::take(&mut self.text);
                self.out.push_str(&t);
                self.out.push('\n');
            }
        } else if along < f * 0.3 && across > sw * f * 15.0 && last != ' ' {
            self.text.push(' ');
        }
    }

    fn flush(&mut self) {
        let t = std::mem::take(&mut self.text);
        self.out.push_str(&t);
    }

    fn op(&mut self, operator: &[u8], operands: &[Operand]) -> Res<()> {
        let n = |i: usize| -> Res<f64> { operands.get(i).ok_or_else(|| "missing operand".to_string())?.num() };
        match operator {
            b"BT" => {
                self.tm = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
                self.flush();
            }
            b"ET" => self.flush(),
            b"q" => self.stack.push((self.cm, self.font.clone(), self.font_size, self.char_scale, self.space_scale, self.space_width, self.tl)),
            b"Q" => match self.stack.pop() {
                Some((cm, font, fs, cs, ss, sw, tl)) => {
                    self.cm = cm;
                    self.font = font;
                    self.font_size = fs;
                    self.char_scale = cs;
                    self.space_scale = ss;
                    self.space_width = sw;
                    self.tl = tl;
                }
                None => self.cm = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            },
            b"cm" => {
                self.flush();
                let m = [n(0)?, n(1)?, n(2)?, n(3)?, n(4)?, n(5)?];
                self.cm = mult(&m, &self.cm);
            }
            b"Tz" => self.char_scale = n(0)? / 100.0,
            b"Tw" => self.space_scale = 1.0 + n(0)?,
            b"TL" => self.tl = n(0)?,
            b"Tf" => {
                if !self.text.is_empty() {
                    self.flush();
                }
                let fname = match operands.first() {
                    Some(Operand::Name(s)) => s.clone(),
                    _ => String::new(),
                };
                match self.cmaps.get(&fname) {
                    Some(f) => {
                        self.space_width = f.space_width;
                        self.font = f.clone();
                    }
                    None => {
                        let u = Rc::new(unknown_font());
                        self.space_width = u.space_width;
                        self.font = u;
                    }
                }
                if let Some(sz) = operands.get(1).and_then(|o| o.num().ok()) {
                    self.font_size = sz;
                }
            }
            b"Td" => {
                let (tx, ty) = (n(0)?, n(1)?);
                self.tm[4] += tx * self.tm[0] + ty * self.tm[2];
                self.tm[5] += tx * self.tm[1] + ty * self.tm[3];
                self.crlf_space();
            }
            b"Tm" => {
                self.tm = [n(0)?, n(1)?, n(2)?, n(3)?, n(4)?, n(5)?];
                self.crlf_space();
            }
            b"T*" => {
                self.tm[5] -= self.tl;
                self.crlf_space();
            }
            b"Tj" => {
                self.tj(operands.first().ok_or("Tj without operand")?)?;
                self.crlf_space();
            }
            _ => {}
        }
        Ok(())
    }

    fn run(&mut self, ops: &[(Vec<Operand>, Vec<u8>)]) -> Res<()> {
        for (operands, operator) in ops {
            match operator.as_slice() {
                b"'" => {
                    self.op(b"T*", &[])?;
                    self.op(b"Tj", operands)?;
                }
                b"\"" => {
                    self.op(b"Tw", &operands[..1.min(operands.len())])?;
                    self.op(b"T*", &[])?;
                    self.op(b"Tj", operands.get(2..).unwrap_or(&[]))?;
                }
                b"TD" => {
                    let ty = operands.get(1).ok_or("TD operand")?.num()?;
                    self.op(b"TL", &[Operand::Num(-ty)])?;
                    self.op(b"Td", operands)?;
                }
                b"TJ" => {
                    if let Some(Operand::Array(items)) = operands.first() {
                        for it in items {
                            match it {
                                Operand::Text(_) | Operand::Bytes(_) => self.op(b"Tj", std::slice::from_ref(it))?,
                                Operand::Num(_) | Operand::Int(_) => {
                                    let v = it.num()?;
                                    if v.abs() >= self.space_width && !self.text.is_empty() && !self.text.ends_with(' ') {
                                        self.op(b"Tj", &[Operand::Text(" ".into())])?;
                                    }
                                }
                                _ => {}
                            }
                        }
                    } else {
                        return Err("TJ without array".into());
                    }
                }
                b"Do" => {
                    self.flush();
                    if !self.out.is_empty() && !self.out.ends_with('\n') {
                        self.out.push('\n');
                    }
                    let sub = (|| -> Res<String> {
                        let Some(Operand::Name(name)) = operands.first() else { return Err("Do operand".into()) };
                        let xobjs = self
                            .resources
                            .and_then(|r| self.pdf.get(r, "XObject"))
                            .and_then(|o| self.pdf.dict(o))
                            .ok_or("no XObject")?;
                        let xo = self.pdf.get(xobjs, name.trim_start_matches('/')).ok_or("missing XObject")?;
                        let Object::Stream(s) = xo else { return Err("XObject not a stream".into()) };
                        if self.pdf.name(&s.dict, "Subtype").as_deref() == Some("/Image") {
                            return Ok(String::new());
                        }
                        let data = s.decompressed_content().unwrap_or_else(|_| s.content.clone());
                        extract_stream(self.pdf, Some(&s.dict), &data)
                    })();
                    // Python swallows XObject failures (logs a warning) and continues.
                    if let Ok(t) = sub {
                        self.out.push_str(&t);
                    }
                }
                other => self.op(other, operands)?,
            }
        }
        Ok(())
    }
}

/// `PageObject._extract_text` for a page (`dict` = page) or a form XObject.
fn extract_stream<'a>(pdf: &'a Pdf<'a>, resources_owner: Option<&'a Dictionary>, content: &[u8]) -> Res<String> {
    let Some(owner) = resources_owner else { return Ok(String::new()) };
    // /Resources may be inherited from /Parent (pages only; a form XObject has no /Parent).
    let mut cur = owner;
    let mut resources = None;
    for _ in 0..64 {
        if let Some(r) = pdf.get(cur, "Resources").and_then(|o| pdf.dict(o)) {
            resources = Some(r);
            break;
        }
        match pdf.get(cur, "Parent").and_then(|o| pdf.dict(o)) {
            Some(p) => cur = p,
            None => break,
        }
    }
    let Some(resources) = resources else { return Ok(String::new()) };

    let mut cmaps = HashMap::new();
    if let Some(fonts) = pdf.get(resources, "Font").and_then(|o| pdf.dict(o)) {
        for (name, fo) in fonts.iter() {
            let ft = pdf.dict(fo).ok_or("font is not a dictionary")?;
            cmaps.insert(format!("/{}", String::from_utf8_lossy(name)), Rc::new(pdf.build_char_map(ft)?));
        }
    }
    let ops = parse_content(content)?;
    let font = Rc::new(Font { space_width: 500.0, enc: Enc::Codec("charmap".into()), map: Map::new() });
    let mut ex = Ex {
        pdf,
        resources: Some(resources),
        cmaps,
        out: String::new(),
        text: String::new(),
        rtl: false,
        cm: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        stack: vec![],
        tm: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        tm_prev: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        char_scale: 1.0,
        space_scale: 1.0,
        space_width: 500.0,
        tl: 0.0,
        font_size: 12.0,
        font,
    };
    ex.run(&ops)?;
    let rest = std::mem::take(&mut ex.text);
    ex.out.push_str(&rest);
    Ok(ex.out)
}

/// `"".join(page.extract_text() + "\n" for page in reader.pages if text)`
pub fn extract_text(data: &[u8]) -> Result<String, String> {
    let doc = Document::load_mem(data).map_err(|e| format!("cannot parse PDF: {e}"))?;
    let pdf = Pdf { doc: &doc };
    let mut text = String::new();
    for (_, page_id) in doc.get_pages() {
        let page = doc.get_dictionary(page_id).map_err(|e| e.to_string())?;
        let mut content = vec![];
        match pdf.get(page, "Contents") {
            Some(Object::Array(parts)) => {
                for p in parts {
                    content.extend(pdf.stream_data(p).unwrap_or_default());
                    content.push(b'\n');
                }
            }
            Some(o @ Object::Stream(_)) => content = pdf.stream_data(o).unwrap_or_default(),
            _ => continue, // KeyError -> ""
        }
        let t = extract_stream(&pdf, Some(page), &content)?;
        if !t.is_empty() {
            text.push_str(&t);
            text.push('\n');
        }
    }
    Ok(text)
}
