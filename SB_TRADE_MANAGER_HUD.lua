-- SB_TRADE_MANAGER_HUD.lua
-- HUD-only display layer for trade manager status.
-- NOTE:
-- 1) This file intentionally does not alter any strategy logic.
-- 2) Existing numeric streams should remain untouched in your strategy script.
-- 3) Feed current runtime states into render_trade_manager_hud(state, draw_text_fn).

local M = {}

local function yn(v)
    return v and "YES" or "NO"
end

local function nz(v, fallback)
    if v == nil or v == "" then
        return fallback
    end
    return tostring(v)
end

local function normalize(v, allowed, fallback)
    local s = nz(v, fallback)
    s = string.upper(s)
    if allowed[s] then
        return s
    end
    return fallback
end

local ALLOWED = {
    DAYTYPE = { FRD = true, FGD = true, NONE = true },
    BIAS = { BULL = true, BEAR = true, NONE = true },
    STRUCTURE = {
        ["IDLE"] = true,
        ["ASIA READY"] = true,
        ["SWEPT"] = true,
        ["BOS"] = true,
    },
    ENTRY = {
        ["WAIT FVG"] = true,
        ["WAIT MITIGATION"] = true,
        ["WAIT RETEST"] = true,
        ["BLUE1"] = true,
        ["BLUE2"] = true,
        ["BLUE3"] = true,
    },
    FVG = { BULLISH = true, BEARISH = true, NONE = true },
}

local function build_hud_lines(state)
    local daytype = normalize(state.daytype, ALLOWED.DAYTYPE, "NONE")
    local trade_day = yn(state.trade_day == true)
    local bias = normalize(state.bias, ALLOWED.BIAS, "NONE")

    local structure_state = normalize(state.structure_state, ALLOWED.STRUCTURE, "IDLE")
    local entry_state = normalize(state.entry_state, ALLOWED.ENTRY, "WAIT FVG")
    local fvg = normalize(state.fvg, ALLOWED.FVG, "NONE")

    local display_ok = yn(state.display_ok == true)
    local score_a = nz(state.score_a, "0")

    local today_trades_current = nz(state.today_trades_current, "0")
    local today_trades_max = nz(state.today_trades_max, "0")

    local entry_price = nz(state.entry_price, "-")
    local tp_price = nz(state.tp_price, "-")
    local sl_price = nz(state.sl_price, "-")

    local blocked_reason = nz(state.blocked_reason, "NONE")

    return {
        "DAYTYPE: " .. daytype,
        "TRADE DAY: " .. trade_day,
        "BIAS: " .. bias,
        "",
        "STRUCTURE STATE:",
        structure_state,
        "",
        "ENTRY STATE:",
        entry_state,
        "",
        "FVG: " .. fvg,
        "",
        "DISPLAY OK: " .. display_ok,
        "SCORE A: " .. score_a,
        "TODAY TRADES: " .. today_trades_current .. " / " .. today_trades_max,
        "",
        "ENTRY: " .. entry_price,
        "TP: " .. tp_price,
        "SL: " .. sl_price,
        "",
        "BLOCKED: " .. blocked_reason,
    }
end

-- draw_text_fn signature:
-- draw_text_fn({ x = number, y = number, text = string, color = "#RRGGBB", size = number })
function M.render_trade_manager_hud(state, draw_text_fn)
    local s = state or {}
    local draw = draw_text_fn

    if type(draw) ~= "function" then
        return false, "draw_text_fn is required"
    end

    local x = s.hud_x or 12
    local y = s.hud_y or 12
    local line_h = s.hud_line_height or 16
    local color = s.hud_color or "#E6EDF3"
    local size = s.hud_size or 12

    local lines = build_hud_lines(s)
    for i = 1, #lines do
        draw({
            x = x,
            y = y + (i - 1) * line_h,
            text = lines[i],
            color = color,
            size = size,
        })
    end

    return true
end

return M
