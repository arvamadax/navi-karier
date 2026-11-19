//! `json.dumps(value)` with Python's defaults (`", "` / `": "` separators, `ensure_ascii=True`).
//! Used only for values stored in the DB (analysis_results.skill_details) so rows written by
//! Rust are byte-identical to rows written by the Python backend.

use serde::Serialize;
use serde_json::{ser::Formatter, Serializer, Value};
use std::io;

struct PyFormatter;

impl Formatter for PyFormatter {
    fn begin_array_value<W: ?Sized + io::Write>(&mut self, w: &mut W, first: bool) -> io::Result<()> {
        if first {
            Ok(())
        } else {
            w.write_all(b", ")
        }
    }
    fn begin_object_key<W: ?Sized + io::Write>(&mut self, w: &mut W, first: bool) -> io::Result<()> {
        if first {
            Ok(())
        } else {
            w.write_all(b", ")
        }
    }
    fn begin_object_value<W: ?Sized + io::Write>(&mut self, w: &mut W) -> io::Result<()> {
        w.write_all(b": ")
    }
    fn write_string_fragment<W: ?Sized + io::Write>(&mut self, w: &mut W, fragment: &str) -> io::Result<()> {
        for c in fragment.chars() {
            if c.is_ascii() && c != '\x7f' {
                w.write_all(&[c as u8])?;
            } else {
                let mut buf = [0u16; 2];
                for unit in c.encode_utf16(&mut buf) {
                    write!(w, "\\u{unit:04x}")?;
                }
            }
        }
        Ok(())
    }
}

pub fn dumps(v: &Value) -> String {
    let mut out = Vec::new();
    let mut ser = Serializer::with_formatter(&mut out, PyFormatter);
    v.serialize(&mut ser).expect("serializing a Value cannot fail");
    String::from_utf8(out).expect("PyFormatter emits ASCII")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn matches_python_json_dumps() {
        let v = json!([{"skill": "Café ☕ 😀", "current": 55, "gap": 20.5, "q": "a\"b\\c\n\u{7f}"}]);
        // python: json.dumps([{"skill": "Café ☕ 😀", "current": 55, "gap": 20.5, "q": "a\"b\\c\n\x7f"}])
        assert_eq!(
            dumps(&v),
            "[{\"skill\": \"Caf\x5Cu00e9 \x5Cu2615 \x5Cud83d\x5Cude00\", \"current\": 55, \"gap\": 20.5, \"q\": \"a\\\"b\\\\c\\n\x5Cu007f\"}]"
        );
        assert_eq!(dumps(&json!([])), "[]");
    }
}
