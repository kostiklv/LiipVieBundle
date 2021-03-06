(function (jQuery) {
    return jQuery.widget("Liip.hallolink", {
        options: {
            editable: null,
            toolbar: null,
            uuid: "link",
            link: true,
            image: true,
            relatedUrl: false,
            defaultUrl: 'http://',
            dialog: 'link',
            dialogOpts: {
                autoOpen: false,
                width: 500,
                height: 195,
                title: "Enter Link",
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallolink-dialog'
            }
        },

        _create: function () {
            var buttonize, buttonset, dialog, dialogId, dialogSubmitCb, urlInput, widget;
            var _this = this;
            widget = this;
            dialogId = "" + this.options.dialog + "-dialog";
            dialog = jQuery("<div id=\"" + dialogId + "\"><div class=\"nav\"><ul class=\"tabs\"><li id=\"" + this.options.uuid + "-tab-insert\">Insert URL</li><li id=\"" + this.options.uuid + "-tab-suggested\">Suggested URLs</li><li id=\"" + this.options.uuid + "-tab-related\">Related URLs</li></ul><img src=\"/bundles/liipvie/img/arrow.png\" id=\"" + dialogId + "-tab-activeIndicator\" class=\"tab-activeIndicator\" /></div><div id=\"" + this.options.uuid + "-tab-insert-content\" class=\"" + dialogId + "-tab\"><form action=\"#\" method=\"post\" class=\"linkForm\"><input class=\"name\" type=\"text\" name=\"name\" value=\"Homepage Name\" /><input class=\"url\" type=\"text\" name=\"url\" value=\"" + this.options.defaultUrl + "\" /><input type=\"submit\" id=\"addlinkButton\" value=\"Insert\" /></form></div><div id=\"" + this.options.uuid + "-tab-suggested-content\" class=\"" + dialogId + "-tab\"><div class=\"scrollable\"><ul></ul></div></div><div id=\"" + this.options.uuid + "-tab-related-content\" class=\"" + dialogId + "-tab\"><div class=\"scrollable\"><ul></ul></div></div></div>");
            urlInput = jQuery('input[name=url]', dialog).focus(function (e) {
                return this.select();
            });

            nameInput = jQuery('input[name=name]', dialog).focus(function(e) {
                return this.select();
            });

            // show or hide tab panels
            jQuery('#link-dialog .nav li').live('click', function () {
                jQuery('.' + dialogId + '-tab').each(function () {
                    return jQuery(this).hide();
                });
                id = jQuery(this).attr('id');
                jQuery('#' + id + '-content').show();
                return jQuery("#" + dialogId + "-tab-activeIndicator").css("margin-left", jQuery(this).position().left + (jQuery(this).width() / 2));
            });

            // Action when user clicks on a suggested link
            jQuery('#'+ this.options.uuid + '-tab-suggested-content li a, #'+ this.options.uuid + '-tab-related-content li a').live('click', function (event) {
                event.preventDefault();
                if (widget.lastSelection.toString() === '') {
                    jQuery('input[name=name]', dialog).val(jQuery(this).text());
                }
                jQuery('input[name=url]', dialog).val(this.href);
                dialog.find('form').trigger('submit');
                jQuery('#link-dialog .nav li').first().trigger('click');
            });

            // if user clicks on the suggestet links tab
            jQuery('#' + this.options.uuid + '-tab-suggested').live('click', function () {
                var container = jQuery('#' + _this.options.uuid + "-tab-suggested-content ul");
                container.empty().append('<li class="loader"><img src="/bundles/liipvie/img/ajax-loader.gif"/></li>');

                var articleTags = _this.prepareTags(_this.getReferenceByTags());

                if(articleTags.length > 0) {
                    var vie = new VIE();
                    vie.use(new vie.DBPediaService({
                        url : "http://dev.iks-project.eu/stanbolfull",
                        proxyDisabled: true
                        }));

                        jQuery(articleTags).each(function () {
                            var that = this;
                            vie.load({
                                entity: this + ""
                                }).
                                using('dbpedia').
                                execute().
                                fail(function(e){
                                    console.log(e);
                                }).
                                done(function(entity) {
                                    jQuery(entity).each(function () {
                                        var data = this;
                                        if (this.attributes) {
                                            data = this.attributes; // different Stanbol version
                                        }
                                        var url = data['<http://xmlns.com/foaf/0.1/primaryTopic>'] || data['<http://xmlns.com/foaf/0.1/homepage>'] || data['<http://xmlns.com/foaf/0.1/page>'] || null;
                                        if (url) {
                                            url = url.substring(1, url.length - 1);
                                            if (container.children('li.loader').size() == 1) {
                                                container.empty();
                                            }
                                            container.append('<li><a href="' + url + '" title="' + url + '">' + _this.tagLabel(that + "") + '</a></li>');
                                        }
                                    });
                                });
                        });
                }
                else {
                    container.empty();
                    container.append('<li class="notice">No results found, please make sure you have some article tags set.</li>');
                }
            });

            // if user clicks on the related links tab
            jQuery('#' + this.options.uuid + '-tab-related').live('click', function () {
                var container = jQuery('#' + _this.options.uuid + "-tab-related-content ul");
                container.empty().append('<li class="loader"><img src="/bundles/liipvie/img/ajax-loader.gif"/></li>');
                var articleTags = _this.getReferenceByTags();

                return jQuery.ajax({
                    type: "GET",
                    url: _this.options.relatedUrl,
                    data: "tags="+articleTags+"&page="+window.location,
                    success: function(response) {
                        var items;
                        container.empty();
                        items = [];

                        if (response.links.length > 0) {
                            $.each(response.links, function() {
                                return items.push('<li><a href="'+this.url+'" title="'+this.url+'">'+this.label+'</a></li>');
                            });
                            container.html(items.join(''));
                        } else {
                            container.append('<li class="notice">No results found, please make sure you have some articles with the same tags set.</li>');
                        }

                    },
                    failure: function(response) {
                        container.empty();
                        container.append('<li>An Error has occured</li>');
                    },
                });
            });

            dialogSubmitCb = function (e) {
                var link, name;
                link = urlInput.val();
                name = nameInput.val();
                e. preventDefault();

                widget.options.editable.restoreSelection(widget.lastSelection);
                if (((new RegExp(/^\s*$/)).test(link)) || link === widget.options.defaultUrl) {
                    if (widget.lastSelection.collapsed) {
                        widget.lastSelection.setStartBefore(widget.lastSelection.startContainer);
                        widget.lastSelection.setEndAfter(widget.lastSelection.startContainer);
                        window.getSelection().addRange(widget.lastSelection);
                    }
                    document.execCommand("unlink", null, "");
                } else {
                    if (widget.lastSelection.startContainer.parentNode.href === void 0) {

                        if (widget.lastSelection.toString() !== name) {
                            var newSelection = window.getSelection();
                            var range = newSelection.getRangeAt(0);

                            newTextNode = document.createTextNode(name);
                            range.extractContents();
                            range.insertNode(newTextNode);
                            range.setStartBefore(newTextNode);
                            range.setEndAfter(newTextNode);
                            newSelection.removeAllRanges();

                            newSelection.addRange(range);
                        }

                        document.execCommand("createLink", null, link);
                    } else {
                        widget.lastSelection.startContainer.parentNode.href = link;
                    }
                }
                widget.options.editable.element.trigger('change');
                widget.options.editable.removeAllSelections();
                dialog.dialog('close');
                return false;
            };

            buttonize = function (type) {
                var button, id;
                id = "" + _this.options.uuid + "-" + type;
                buttonset.append(jQuery("<input id=\"" + id + "\" type=\"checkbox\" /><label for=\"" + id + "\" class=\"anchor_button\" >" + type + "</label>").button());
                button = jQuery("#" + id, buttonset);

                button.bind("change", function (event) {
                    widget.lastSelection = widget.options.editable.getSelection();
                    urlInput = jQuery('input[name=url]', dialog);
                    nameInput = jQuery('input[name=name]', dialog);
                    if (widget.lastSelection.startContainer.parentNode.href === void 0) {
                        urlInput.val(widget.options.defaultUrl);
                        if (widget.lastSelection.toString() !== "") {
                            nameInput.val(widget.lastSelection.toString());
                        }
                    } else {
                        urlInput.val(jQuery(widget.lastSelection.startContainer.parentNode).attr('href'));
                        jQuery(urlInput[0].form).find('input[type=submit]').val('update');
                        if (widget.lastSelection.toString() !== "") {
                            nameInput.val(widget.lastSelection.toString());
                        }
                    }
                    return dialog.dialog('open');
                });

                return _this.element.bind("keyup paste change mouseup", function (event) {
                    var nodeName, start;
                    start = jQuery(widget.options.editable.getSelection().startContainer);
                    nodeName = start.prop('nodeName') ? start.prop('nodeName') : start.parent().prop('nodeName');
                    if (nodeName && nodeName.toUpperCase() === "A") {
                        button.attr("checked", true);
                        button.next().addClass("ui-state-clicked");
                        return button.button("refresh");
                    } else {
                        button.attr("checked", false);
                        button.next().removeClass("ui-state-clicked");
                        return button.button("refresh");
                    }
                });
            };

            dialog.find("form").submit(dialogSubmitCb);
            buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");

            if (this.options.link) buttonize("A");
            if (this.options.link) {
                buttonset.buttonset();
                this.options.toolbar.append(buttonset);
                return dialog.dialog(this.options.dialogOpts);
            }
        },
        _init: function () {
            var firstTab = jQuery('#link-dialog .nav li').first().attr("id");
            jQuery('#' + firstTab + '-content').show();
        },

        getReferenceByTags: function () {
            var tmpArticleTags;

            tmpArticleTags = jQuery('.inEditMode').parent().find('.articleTags input').val();
            /*tmpArticleTags = tmpArticleTags.replace(/</g, '');
            tmpArticleTags = tmpArticleTags.replace(/>/g, '');*/
            // uri = uri.replace(/^</, '').replace(/>$/, '');
            tmpArticleTags = tmpArticleTags.split(',');

            return tmpArticleTags;
        },

        prepareTags: function (tmpArticleTags) {
            var articleTags = [];
            var tagType;

            for(var i in tmpArticleTags) {
                tagType = typeof tmpArticleTags[i];
                if('string' === tagType) {
                    if(tmpArticleTags[i].indexOf('http') !== -1) articleTags.push(tmpArticleTags[i]);
                }
            }

            return articleTags;
        },

        tagLabel: function (value) {

            if (value.substring(0, 9) == '<urn:tag:') {
                value = value.substring(9, value.length - 1);
            }

            if (value.substring(0, 8) == '<http://') {
                value = value.substring(value.lastIndexOf('/') + 1, value.length - 1);
                value = value.replace(/_/g, ' ');
            }

            return value;
        }

    });
})(jQuery);