use rand::RngCore;
use security_framework::passwords::{delete_generic_password, get_generic_password, set_generic_password};

const SERVICE: &str = "com.artha.vault";
const ACCOUNT: &str = "vault-encryption-key";

pub fn get_or_create_vault_key() -> Result<[u8; 32], String> {
    if let Ok(existing) = get_generic_password(SERVICE, ACCOUNT) {
        if existing.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&existing);
            return Ok(key);
        }

        // Remove malformed keys before regenerating.
        let _ = delete_generic_password(SERVICE, ACCOUNT);
    }

    let mut key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut key);

    set_generic_password(SERVICE, ACCOUNT, &key)
        .map_err(|error| format!("Failed to persist key: {error}"))?;

    Ok(key)
}
