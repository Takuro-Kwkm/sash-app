# LIXIL インプラス 浴室仕様 v1.0 Integration

- Classification: `NON-PRODUCT-MASTER`
- Integration product: `SER-LIXIL-INPLUS`
- Product variant: `bathroom` / 浴室仕様
- Formal Product Master: `1GJknHnjU0-hvNvTS2X8fajuTkE0SvX0m`
- Formal SHA-256: `58397e2dfc4b4fb74f62b14b4d9b22943de96c866a107cc48d52dcadd2c1bfcb`
- Formal package: `1NqtsDPZNOil3YUXTarIylFTrvipkNcdt`
- Official baseline: LIXIL SN4200 2026年09月版
- Formal fields: 40 mapped / Critical UNMAPPED 0
- Controlled Unresolved: IB-G001..IB-G007; automatic resolution prohibited
- Standard Inplus Formal Runtime and Registry: read-only / mutation 0

The bathroom adapter is selected only after the shared Inplus product has been selected and `product_variant=bathroom`. Switching variants re-resolves from the target authority and omits stale values from selection, persistence, and handoff payloads.
