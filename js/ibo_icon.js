/**
 * Version: 1.0.2
 *
 * Copyright (C) 2021 - spilymp (https://github.com/spilymp)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

class IBO_ICON {

    constructor(settings) {

        // set default parameter
        this.font_color = "#ffffff";
        this.font_family = "Font Awesome 5 Free";
        this.font_weight = 900;
        this.icon_background = "#9b4dca";
        this.icon_class = "fas fa-address-card";
        this.icon_width = 300;
        this.odoo_version = "13.0";
        this.img = null;
        this.img_shadow = null;
        this.img_settings = {};

        // overwrite default parameter
        if (settings != null) {
            Object.assign(this, settings);
        }

        // calculate default parameter if not set manually in settings
        if (settings != null && !("font_size" in settings)) {
            this.font_size = this.icon_width * 0.5;
        }
        if (settings != null && !("icon_text" in settings)) {
            let ufw = this._getUnicodeAndFontWeight(this.icon_class);
            this.icon_text = ufw[0];
            if (settings != null && !("font_weight" in settings)) {
                this.font_weight = ufw[1];
            }
        }

        // set other non public settings
        this._canvas = false;
        this._ctx = false;
        this._isFontLoaded = false;
    }

    /**
     * Central function to create the icon based on the parameters from the initialization (see Constructor).
     *
     * @param {*} element - ID of the HTML element to which the icon is attached in the form of a canvas element.
     */
    draw(element) {
        document.fonts.ready.then(() => this._draw(element));
    };

    async _draw(element) {
        this._setUp();
        await this._setupImage();
        this._setBackground();
        this._setHardShadow();
        this._setMainImage();
        this._setTextWithShadow();
        this._setInlineShadow();
        this._setGradient();
        document.querySelectorAll('canvas').forEach((elem) => elem.remove());
        document.getElementById(element).appendChild(this.canvas);
    }

    /**
     * Set up canvas and get context
     */
    _setUp() {
        // Clear any old canvas elements
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("class", "ibo-icon-canvas");
        this.canvas.height = this.icon_width;
        this.canvas.width = this.icon_width;

        this._ctx = this.canvas.getContext("2d");
        this._ctx.font = `${this.font_weight} ${this.font_size}px "${this.font_family}"`;
    }

    _setupImage() {
        this.img = null;
        this.img_shadow = null;

        const fileInput = document.querySelector("#file-input");
        if (fileInput.files.length === 0) {
            return;
        }
        if (!fileInput.files[0].type.match("image.*")) {
            document.querySelector('.not-an-image-error').style.display = 'block';
            return;
        }

        return new Promise((resolve, reject) => {
            this.img = new Image();
            this.img.onload = () => {
                // first store a bunch of values used for drawing later
                this.img_settings = {};
                if (this.img.width >= this.img.height) {
                    this.img_settings.ratio = this.img.height / this.img.width;
                    this.img_settings.w = this.canvas.width * this.image_scale;
                    this.img_settings.h = (this.canvas.height * this.img_settings.ratio) * this.image_scale;
                } else {
                    this.img_settings.ratio = this.img.width / this.img.height;
                    this.img_settings.w = (this.canvas.width * this.img_settings.ratio) * this.image_scale;
                    this.img_settings.h = this.canvas.height * this.image_scale;
                }
                this.img_settings.x = this.canvas.width / 2 - this.img_settings.w / 2;
                this.img_settings.y = this.canvas.height / 2 - this.img_settings.h / 2;

                // Like with the text we'll draw the image multiple times to create a shadow. For this we use a
                // temporary canvas we can tint
                const svgCanvas = document.createElement("canvas");
                svgCanvas.width = this.canvas.width;
                svgCanvas.height = this.canvas.height;
                const svgCtx = svgCanvas.getContext("2d");
                svgCtx.drawImage(
                    this.img,
                    0, 0,
                    this.img.width, this.img.height,
                    this.img_settings.x, this.img_settings.y,
                    this.img_settings.w, this.img_settings.h);

                const svgData = svgCtx.getImageData(0, 0, svgCanvas.width, svgCanvas.height);
                const data = svgData.data;

                const shadowHex = this._pSBC(-0.4, this.icon_background).match(/[^#]{1,2}/g)
                const shadowRgb = [
                    parseInt(shadowHex[0], 16),
                    parseInt(shadowHex[1], 16),
                    parseInt(shadowHex[2], 16)
                ];

                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] !== 0) { // skip pixels with alpha
                        data[i] = shadowRgb[0];
                        data[i + 1] = shadowRgb[1];
                        data[i + 2] = shadowRgb[2];
                    }
                }
                svgCtx.putImageData(svgData, 0, 0);
                this.img_shadow = new Image();
                this.img_shadow.onload = () => {
                    resolve();
                }
                this.img_shadow.src = svgCanvas.toDataURL();
            }

            var reader = new FileReader();
            reader.readAsDataURL(fileInput.files[0]);
            reader.onload = (file) => {
                // this.img.crossOrigin = "anonymous";
                this.img.src = file.target.result;
            }
        })
    }

    /**
     * Helper function to draw the main image to the canvas
     */
     _setMainImage() {
        if (this.img !== null) {
            this._setImage(this.img, 0, 0);
        }
    }

    /**
     * Function to draw svg/image to the canvas.
     * @param {*} img       - what image to draw
     * @param {*} x_offset  - offset x position of image
     * @param {*} y_offset  - offset y position of image
     */
    _setImage(img, x_offset, y_offset) {
        this._ctx.drawImage(
            img,
            x_offset + this.canvas.width / 2 - this.img_settings.w / 2,
            y_offset + this.canvas.height / 2 - this.img_settings.h / 2,
            this.img_settings.w, this.img_settings.h);
    }

    /**
     * Draw background color
     */
    _setBackground() {
        let radius = this.icon_width * 0.047

        this._ctx.beginPath();

        switch (this.odoo_version) {
            case "11.0":
                this._ctx.rect(0, 0, this.icon_width, this.icon_width);
                break;
            case "12.0":
            case "13.0":
            case "14.0":
            case "15.0":
                this._ctx.moveTo(radius, 0);
                this._ctx.lineTo(this.icon_width - radius, 0);
                this._ctx.arcTo(this.icon_width, 0, this.icon_width, radius, radius);
                this._ctx.lineTo(this.icon_width, this.icon_width - radius);
                this._ctx.arcTo(this.icon_width, this.icon_width, this.icon_width - radius, this.icon_width, radius);
                this._ctx.lineTo(radius, this.icon_width);
                this._ctx.arcTo(0, this.icon_width, 0, this.icon_width - radius, radius);
                this._ctx.lineTo(0, radius);
                this._ctx.arcTo(0, 0, this.icon_width - radius, 0, radius);
                break;
            default:
                console.log("Unsupported version selected.");
                break;
        }
        this._ctx.clip();
        this._ctx.fillStyle = this.icon_background;
        this._ctx.fill();
    }

    /**
     * Helping function to draw text/symbols to the canvas.
     *
     * @param {*} text      - the text or symbol which should be drawn to the canvas
     * @param {*} color     - the color of the text
     * @param {*} centerX   - text position on the x achsis of the canvas
     * @param {*} centerY   - text position on the y achsis of the canvas
     */
    _setText(text, color, centerX, centerY, font_size) {
        if (text === "none") { // skip if no text set
            return;
        }
        this._ctx.save();
        this._ctx.fillStyle = color;
        this._ctx.font = `${this.font_weight} ${font_size}px "${this.font_family}"`;
        this._ctx.textAlign = "center";
        this._ctx.textBaseline = "middle";
        this._ctx.fillText(`${text}`, centerX, centerY);
        this._ctx.restore();
    }

    /**
     * Helper function to draw the main image to the canvas
     */
     _setMainImage() {
        if (this.img !== null) {
            this._setImage(this.img, 0, 0);
        }
    }

    /**
     * Function to draw svg/image to the canvas.
     * @param {*} img       - what image to draw
     * @param {*} x_offset  - offset x position of image
     * @param {*} y_offset  - offset y position of image
     */
     _setImage(img, x_offset, y_offset) {
        this._ctx.drawImage(
            img,
            x_offset, y_offset,
            img.width, img.height,
            this.img_settings.x, this.img_settings.y,
            this.img_settings.w, this.img_settings.h);
        }

    /**
     * Function to draw img to the canvas with some shadow.
     */
    _setImageWithShadow() {
        if (this.img === null) {
            return;
        }

        this._ctx.save();

        // switch (this.odoo_version) {
        //     case "11.0":
        //         break;
        //     case "12.0":
        //     case "13.0":
        //     case "14.0":
        //     case "15.0":
        //         this._ctx.shadowOffsetX = 0;
        //         this._ctx.shadowOffsetY = this.icon_width * 0.02;
        //         this._ctx.shadowBlur = 0;
        //         this._ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        //         break;
        //     default:
        //         console.log("Unsupported version selected.");
        //         break;
        // }

        this._setImage(this.img, 0, 0);
        this._ctx.restore();

    }

    /**
     * Shade, blend and convert a color.
     *
     * Credit to and Copyright by Pimp Trizkit (https://github.com/PimpTrizkit)
     * Documentation see https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
     */
    _pSBC(p, c0, c1, l) {
        let r,
            g,
            b,
            P,
            f,
            t,
            h,
            i = parseInt,
            m = Math.round,
            a = typeof c1 === "string";
        if (
            typeof p != "number" ||
            p < -1 ||
            p > 1 ||
            typeof c0 != "string" ||
            (c0[0] != "r" && c0[0] != "#") ||
            (c1 && !a)
        )
            return null;
        if (!this.pSBCr)
            this.pSBCr = d => {
                let n = d.length,
                    x = {};
                if (n > 9) {
                    ([r, g, b, a] = d = d.split(",")), (n = d.length);
                    if (n < 3 || n > 4) return null;
                    (x.r = i(r[3] === "a" ? r.slice(5) : r.slice(4))),
                        (x.g = i(g)),
                        (x.b = i(b)),
                        (x.a = a ? parseFloat(a) : -1);
                } else {
                    if (n === 8 || n === 6 || n < 4) return null;
                    if (n < 6)
                        d =
                            "#" +
                            d[1] +
                            d[1] +
                            d[2] +
                            d[2] +
                            d[3] +
                            d[3] +
                            (n > 4 ? d[4] + d[4] : "");
                    d = i(d.slice(1), 16);
                    if (n === 9 || n === 5)
                        (x.r = (d >> 24) & 255),
                            (x.g = (d >> 16) & 255),
                            (x.b = (d >> 8) & 255),
                            (x.a = m((d & 255) / 0.255) / 1000);
                    else
                        (x.r = d >> 16),
                            (x.g = (d >> 8) & 255),
                            (x.b = d & 255),
                            (x.a = -1);
                }
                return x;
            };
        (h = c0.length > 9),
            (h = a ? (c1.length > 9 ? true : c1 === "c" ? !h : false) : h),
            (f = this.pSBCr(c0)),
            (P = p < 0),
            (t =
                c1 && c1 != "c"
                    ? this.pSBCr(c1)
                    : P
                        ? { r: 0, g: 0, b: 0, a: -1 }
                        : { r: 255, g: 255, b: 255, a: -1 }),
            (p = P ? p * -1 : p),
            (P = 1 - p);
        if (!f || !t) return null;
        if (l)
            (r = m(P * f.r + p * t.r)),
                (g = m(P * f.g + p * t.g)),
                (b = m(P * f.b + p * t.b));
        else
            (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)),
                (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)),
                (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5));
        (a = f.a),
            (t = t.a),
            (f = a >= 0 || t >= 0),
            (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0);
        if (h)
            return (
                "rgb" +
                (f ? "a(" : "(") +
                r +
                "," +
                g +
                "," +
                b +
                (f ? "," + m(a * 1000) / 1000 : "") +
                ")"
            );
        else
            return (
                "#" +
                (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0))
                    .toString(16)
                    .slice(1, f ? undefined : -2)
            );
    };

    _setHardShadow() {
        if (this.icon_text != "none") {
            for (let i = 0; i < (this.icon_width * (2 / 3)); i++) {
                const tmp_width = (this.icon_width - 2 * i) / 2;
                const tmp_height = (this.icon_width + 2 * i) / 2;

                this._setText(
                    this.icon_text,
                    this._pSBC(-0.4, this.icon_background),
                    tmp_width,
                    tmp_height,
                    this.font_size
                );
            }
        }

        if (this.img_shadow !== null) {
            for (let i = 0; i < this.img_shadow.width / 2; i++) {
                const x_offset = ((this.icon_width - 2 * i) / 2) - (this.img_shadow.width / 2);
                const y_offset = ((this.icon_width + 2 * i) / 2) - (this.img_shadow.width / 2);
                this._ctx.drawImage(
                    this.img_shadow,
                    x_offset, y_offset
                )
            }
        }
    }

    /**
     * Sets a lighter shadow that extends to the lower left corner of the icon.
     */
    _setTextWithShadow() {
        if (this.icon_text === "none") {  // skip if there is no icon set
            return;
        }

        this._ctx.save();

        switch (this.odoo_version) {
            case "11.0":
                break;
            case "12.0":
            case "13.0":
            case "14.0":
            case "15.0":
                this._ctx.shadowOffsetX = 0;
                this._ctx.shadowOffsetY = this.icon_width * 0.02;
                this._ctx.shadowBlur = 0;
                this._ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                break;
            default:
                console.log("Unsupported version selected.");
                break;
        }

        this._setText(
            this.icon_text,
            this.font_color,
            this.icon_width / 2,
            this.icon_width / 2,
            this.font_size
        );
        this._ctx.restore();
    }

    /**
     * Sets an inward shadow for the top and bottom edges of the icon.
     * Will only be displayed depending on the selected version.
     */
    _setInlineShadow() {
        switch (this.odoo_version) {
            case "11.0":
                break;
            case "12.0":
            case "13.0":
            case "14.0":
            case "15.0":
                let is_radius = this.icon_width * 0.047
                let is_height = this.icon_width * 0.015

                this._ctx.save();
                this._ctx.globalAlpha = 0.4;

                // inner shadow bottom
                this._ctx.fillStyle = "#282F33";
                this._ctx.beginPath();
                this._ctx.moveTo(is_radius - is_height, this.icon_width);
                this._ctx.lineTo(this.icon_width - is_radius, this.icon_width);
                this._ctx.arcTo(this.icon_width, this.icon_width, this.icon_width, this.icon_width - is_radius, is_radius);
                this._ctx.lineTo(this.icon_width, this.icon_width - (is_radius + is_height));
                this._ctx.arcTo(this.icon_width, this.icon_width - is_height, this.icon_width - is_radius, this.icon_width - is_height, is_radius);
                this._ctx.lineTo(is_radius, this.icon_width - is_height);
                this._ctx.arcTo(0, this.icon_width - is_height, 0, this.icon_width - (is_radius + is_height), is_radius);
                this._ctx.lineTo(0, this.icon_width - is_height);
                this._ctx.arcTo(0, this.icon_width, is_radius - is_height, this.icon_width, is_radius);
                this._ctx.fill();

                // inner shadow top
                this._ctx.fillStyle = "#FFFFFF";
                this._ctx.beginPath();
                this._ctx.moveTo(is_radius - is_height, 0);
                this._ctx.lineTo(this.icon_width - is_radius, 0);
                this._ctx.arcTo(this.icon_width, 0, this.icon_width, is_radius - is_height, is_radius);
                this._ctx.lineTo(this.icon_width, is_radius + 2);
                this._ctx.arcTo(this.icon_width, is_height, this.icon_width - is_radius, is_height, is_radius);
                this._ctx.lineTo(is_radius, is_height);
                this._ctx.arcTo(0, is_height, 0, is_radius + is_height, is_radius);
                this._ctx.lineTo(0, is_radius);
                this._ctx.arcTo(0, 0, is_radius - is_height, 0, is_radius);
                this._ctx.fill();

                this._ctx.restore();
                break;
            default:
                console.log("Unsupported version selected.");
                break;
        }
    }

    /**
     * Puts a slight gradient over the icon.
     * Will only be displayed depending on the selected version.
     */
    _setGradient() {
        switch (this.odoo_version) {
            case "11.0":
                break;
            case "12.0":
            case "13.0":
            case "14.0":
            case "15.0":
                this._ctx.save();
                this._ctx.globalAlpha = 0.2;
                var gradient = this._ctx.createLinearGradient(
                    0,
                    this.icon_width,
                    this.icon_width,
                    0
                );
                gradient.addColorStop(0, "rgba(0,0,0,0)");
                gradient.addColorStop(1, "#FFFFFF");
                this._ctx.fillStyle = gradient;
                this._ctx.fillRect(0, 0, this.icon_width, this.icon_width);
                this._ctx.restore();
                break;
            default:
                console.log("Unsupported version selected.");
                break;
        }
    }

    /**
     * Helper function to extract the corresponding symbol based on a given class.
     * @param {*} clazzName - The CSS class from which the symbol should be extracted.
     */
    _getUnicodeAndFontWeight(clazzName) {
        let tempI = document.createElement('i');

        tempI.className = clazzName;
        document.body.appendChild(tempI);

        //let char = window.getComputedStyle(document.querySelector('.' + clazzName), ':before').getPropertyValue('content').replace(/'|"/g, '');
        let char = window.getComputedStyle(tempI, ':before').content.replace(/'|"/g, '');
        let font_weight = window.getComputedStyle(tempI).getPropertyValue( "font-weight" );
        tempI.remove();

        // Logging for debug purposes
        // console.log("Unicode: " + char + " # Font-Weight: " + font_weight);
        return [char, font_weight];
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const clear_file_btn = document.querySelector('.clear-file-btn');
    const input_field = document.querySelector("#file-input");
    const not_an_image_error = document.querySelector('.not-an-image-error');

    clear_file_btn.addEventListener('click', (e)=>{
        e.target.style.display = 'none';
        input_field.value = null;
        not_an_image_error.style.display = 'none';
        generate();
    })

    input_field.addEventListener('change', (e) => {
        if (e.target.value) {
            not_an_image_error.style.display = 'none';
            clear_file_btn.style.display = 'inline-block';
        } else {
            clear_file_btn.style.display = 'none';
        }
        generate();
    });
    generate();
});

function generate() {
    document.getElementById("icon").innerHTML = '';
    let icon = new IBO_ICON({
        'font_color': document.getElementById('iconFontColor').value,
        'font_family': document.getElementById('iconSet').value,
        'font_size': parseInt(document.getElementById('iconFontSizeValue').value),
        'font_weight': parseInt(document.getElementById('fontWeight').value),
        'icon_background': document.getElementById('iconBackgroundColor').value,
        'icon_class': document.getElementById('iconClass').value,
        'icon_width': parseInt(document.getElementById('iconSizeValue').value),
        'image_scale': parseInt(document.getElementById('imageScaleValue').value) / 100.0,
        'odoo_version': document.getElementById('odooVersion').value,
    });
    icon.draw("icon");
}

function toggle_settings() {
    document.querySelectorAll('.settings-card').forEach(function (element) {
        element.classList.toggle('deactivated');
    });
}

function download() {
    let image = document.getElementsByClassName('ibo-icon-canvas')[0].toDataURL("image/png").replace("image/png", "image/octet-stream");
    document.getElementById('download').setAttribute('href', image);
}

function populateIconSetWebsite() {
    switch (document.getElementById('iconSet').value) {
        case "Font Awesome 5 Brands":
            document.getElementById('iconSetWebsite').href = "https://fontawesome.com/v5/search?m=free&s=brands"
            document.getElementById('iconClass').placeholder = "e.g. fab fa-github"
            break;
        case "FontAwesome":
            document.getElementById('iconSetWebsite').href = "https://fontawesome.com/v4/icons/"
            document.getElementById('iconClass').placeholder = "e.g. fa fa-bath"
            break;
        case "bootstrap-icons":
            document.getElementById('iconSetWebsite').href = "https://icons.getbootstrap.com/"
            document.getElementById('iconClass').placeholder = "e.g. bi bi-droplet"
            break;
        case "simple-line-icons":
            document.getElementById('iconSetWebsite').href = "https://simplelineicons.github.io/"
            document.getElementById('iconClass').placeholder = "e.g. icon-globe-alt"
            break;
        case "remixicon":
            document.getElementById('iconSetWebsite').href = "https://remixicon.com/"
            document.getElementById('iconClass').placeholder = "e.g. ri-customer-service-line"
            break;
        case "tabler-icons":
            document.getElementById('iconSetWebsite').href = "https://tabler-icons.io/"
            document.getElementById('iconClass').placeholder = "e.g. ti ti-bone-off"
            break;
        case "weathericons":
            document.getElementById('iconSetWebsite').href = "http://erikflowers.github.io/weather-icons/"
            document.getElementById('iconClass').placeholder = "e.g. wi-day-sleet-storm"
            break;
        default:
            document.getElementById('iconSetWebsite').href = "https://fontawesome.com/v5/search?m=free&s=solid%2Cregular"
            document.getElementById('iconClass').placeholder = "e.g. fas fa-carrot"
            break;
    }
}
